import { BookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/apiError';
import { logger } from '../config/logger';

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  data: {
    bookingId: string;
    status: PaymentStatus;
    amount?: number;
    transactionId?: string;
    paymentMethod?: string;
  };
  rawPayload?: any;
}

export class WebhookService {
  static async handleWebhook(payload: WebhookEventPayload) {
    const { eventId, eventType, data } = payload;

    // 1. IDEMPOTENCY CHECK
    // If this event has already been registered, return immediately without duplicate processing
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      logger.warn(
        `[IDEMPOTENCY] Webhook event "${eventId}" has already been processed at ${existingEvent.processedAt.toISOString()}. Skipping side effects.`
      );
      return {
        isDuplicate: true,
        status: 'ignored',
        message: 'Event already processed (Idempotent response)',
        eventId,
        originalProcessedAt: existingEvent.processedAt,
      };
    }

    // 2. ATOMIC EXECUTION VIA TRANSACTION
    return prisma.$transaction(async (tx) => {
      // Find the associated booking
      const booking = await tx.booking.findUnique({
        where: { id: data.bookingId },
      });

      if (!booking) {
        // Record failed webhook attempt so it doesn't loop
        await tx.webhookEvent.create({
          data: {
            eventId,
            eventType,
            bookingId: data.bookingId,
            status: 'FAILED',
            payload: payload.rawPayload || (payload as any),
          },
        });

        logger.error(
          `Webhook event ${eventId} received for non-existent booking ID ${data.bookingId}`
        );
        throw AppError.notFound(`Booking ID "${data.bookingId}" not found for webhook event.`);
      }

      const isSuccess = data.status === PaymentStatus.SUCCESS;
      const targetBookingStatus = isSuccess ? BookingStatus.CONFIRMED : BookingStatus.FAILED;

      // Check if booking is already confirmed (e.g. from direct payment or previous webhook)
      if (booking.status === BookingStatus.CONFIRMED && isSuccess) {
        logger.info(
          `Webhook event ${eventId}: Booking ${booking.id} is already CONFIRMED. Recording event only.`
        );
      } else if (booking.status !== BookingStatus.CANCELLED) {
        // Update booking status if not cancelled
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: targetBookingStatus },
        });
      }

      // Record the payment entry if transactionId is unique
      const txnId = data.transactionId || `TXN_WH_${Date.now()}_${eventId.substring(0, 6)}`;
      
      const existingPayment = await tx.payment.findUnique({
        where: { transactionId: txnId },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: data.amount || booking.amount,
            status: data.status,
            transactionId: txnId,
            paymentMethod: data.paymentMethod || 'WEBHOOK_GATEWAY',
            rawResponse: payload.rawPayload || (payload as any),
          },
        });
      }

      // 3. RECORD THE WEBHOOK EVENT (guarantees idempotency on future deliveries)
      await tx.webhookEvent.create({
        data: {
          eventId,
          eventType,
          bookingId: booking.id,
          status: 'PROCESSED',
          payload: payload.rawPayload || (payload as any),
        },
      });

      logger.info(
        `Webhook event ${eventId} processed successfully. Booking ${booking.id} status updated to ${targetBookingStatus}.`
      );

      return {
        isDuplicate: false,
        status: 'processed',
        message: 'Webhook processed successfully',
        eventId,
        bookingId: booking.id,
        bookingStatus: targetBookingStatus,
      };
    });
  }
}

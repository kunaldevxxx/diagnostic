import { BookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/apiError';
import { logger } from '../config/logger';

export interface ProcessPaymentInput {
  bookingId: string;
  userId: string;
  role?: string;
  simulateOutcome?: PaymentStatus;
  paymentMethod?: string;
}

export class PaymentService {
  static async processPayment(data: ProcessPaymentInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        centre: { select: { id: true, name: true } },
        test: { select: { id: true, name: true } },
      },
    });

    if (!booking) {
      throw AppError.notFound(`Booking with ID "${data.bookingId}" was not found.`);
    }

    // Ownership check
    if (booking.userId !== data.userId && data.role !== 'ADMIN') {
      throw AppError.forbidden('You are not authorized to pay for this booking.');
    }

    // Edge-case state guards
    if (booking.status === BookingStatus.CONFIRMED) {
      throw AppError.badRequest('This booking is already paid and confirmed.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw AppError.badRequest('Cannot process payment for a cancelled booking.');
    }

    // Determine simulated outcome
    const outcome = data.simulateOutcome || PaymentStatus.SUCCESS;
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Execute atomic update: Record payment + update booking status
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.amount,
          status: outcome,
          transactionId,
          paymentMethod: data.paymentMethod || 'MOCK_GATEWAY',
          rawResponse: {
            gateway: 'MOCK_PAYMENT_SERVICE',
            timestamp: new Date().toISOString(),
            status: outcome,
            transactionId,
          },
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: outcome === PaymentStatus.SUCCESS ? BookingStatus.CONFIRMED : BookingStatus.FAILED,
        },
        include: {
          centre: { select: { id: true, name: true } },
          test: { select: { id: true, name: true } },
        },
      });

      return { payment, booking: updatedBooking };
    });

    logger.info(
      `Payment ${outcome} for Booking ${booking.id}. Transaction ID: ${transactionId}`
    );

    return {
      paymentId: result.payment.id,
      transactionId: result.payment.transactionId,
      amount: result.payment.amount,
      paymentStatus: result.payment.status,
      bookingStatus: result.booking.status,
      booking: result.booking,
    };
  }
}

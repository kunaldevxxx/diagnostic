import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

export const simulatePaymentSchema = z.object({
  body: z.object({
    bookingId: z.string({ required_error: 'bookingId is required' }).uuid('Invalid booking ID format'),
    simulateOutcome: z.nativeEnum(PaymentStatus).optional(),
    paymentMethod: z.string().optional().default('MOCK_GATEWAY'),
  }),
});

export const webhookPayloadSchema = z.object({
  body: z.object({
    eventId: z.string({ required_error: 'eventId is required' }).min(1, 'eventId cannot be empty'),
    eventType: z.string({ required_error: 'eventType is required' }).min(1),
    data: z.object({
      bookingId: z.string({ required_error: 'bookingId is required in data' }).uuid('Invalid booking ID format'),
      status: z.nativeEnum(PaymentStatus, { required_error: 'status (SUCCESS/FAILED) is required in data' }),
      amount: z.number().positive().optional(),
      transactionId: z.string().optional(),
      paymentMethod: z.string().optional(),
    }),
  }),
});

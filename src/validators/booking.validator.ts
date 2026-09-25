import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

export const createBookingSchema = z.object({
  body: z.object({
    centreId: z.string({ required_error: 'Diagnostic centre ID is required' }).uuid('Invalid centre ID format'),
    testId: z.string({ required_error: 'Diagnostic test ID is required' }).uuid('Invalid test ID format'),
    appointmentDate: z
      .string({ required_error: 'Appointment date and time is required' })
      .datetime({ message: 'Appointment date must be a valid ISO 8601 datetime (e.g. 2026-10-01T10:00:00Z)' })
      .refine(
        (val) => new Date(val).getTime() > Date.now(),
        { message: 'Appointment date and time must be in the future' }
      ),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  }),
});

export const queryBookingsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(BookingStatus).optional(),
    page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10)),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid booking ID format'),
  }),
});

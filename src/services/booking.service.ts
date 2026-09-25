import { BookingStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/apiError';

export interface CreateBookingInput {
  userId: string;
  centreId: string;
  testId: string;
  appointmentDate: string;
  notes?: string;
}

export interface QueryBookingsInput {
  userId: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export class BookingService {
  static async createBooking(data: CreateBookingInput) {
    const appointmentDateTime = new Date(data.appointmentDate);

    // Validate that appointment date is strictly in the future
    if (appointmentDateTime.getTime() <= Date.now()) {
      throw AppError.badRequest('Appointment date and time must be in the future.');
    }

    // Verify centre and test association + availability
    const centreTest = await prisma.centreTest.findUnique({
      where: {
        centreId_testId: {
          centreId: data.centreId,
          testId: data.testId,
        },
      },
      include: {
        centre: true,
        test: true,
      },
    });

    if (!centreTest) {
      throw AppError.badRequest(
        'The selected diagnostic centre does not offer the requested test.'
      );
    }

    if (!centreTest.isAvailable) {
      throw AppError.badRequest(
        'The requested test is currently unavailable at this diagnostic centre.'
      );
    }

    // Server-enforced pricing: lock amount from verified CentreTest price to prevent tampering
    const booking = await prisma.booking.create({
      data: {
        userId: data.userId,
        centreId: data.centreId,
        testId: data.testId,
        appointmentDate: appointmentDateTime,
        amount: centreTest.price,
        status: BookingStatus.PENDING,
        notes: data.notes,
      },
      include: {
        centre: {
          select: {
            id: true,
            name: true,
            location: true,
            city: true,
            contactPhone: true,
          },
        },
        test: {
          select: {
            id: true,
            name: true,
            category: true,
            turnaroundTime: true,
            sampleRequired: true,
          },
        },
      },
    });

    return booking;
  }

  static async getUserBookings(query: QueryBookingsInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: query.userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          centre: {
            select: { id: true, name: true, location: true, city: true },
          },
          test: {
            select: { id: true, name: true, category: true, turnaroundTime: true },
          },
          payments: {
            select: { id: true, status: true, transactionId: true, amount: true, createdAt: true },
          },
        },
      }),
    ]);

    return {
      bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBookingById(bookingId: string, userId: string, role?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        centre: true,
        test: true,
        payments: true,
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    if (!booking) {
      throw AppError.notFound(`Booking with ID "${bookingId}" was not found.`);
    }

    // Ownership check: users can only see their own bookings unless admin
    if (booking.userId !== userId && role !== 'ADMIN') {
      throw AppError.forbidden('You do not have permission to view this booking.');
    }

    return booking;
  }

  static async cancelBooking(bookingId: string, userId: string, role?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw AppError.notFound(`Booking with ID "${bookingId}" was not found.`);
    }

    // Authorization check
    if (booking.userId !== userId && role !== 'ADMIN') {
      throw AppError.forbidden('You do not have permission to cancel this booking.');
    }

    // State machine guard: can only cancel PENDING or CONFIRMED
    if (booking.status === BookingStatus.CANCELLED) {
      throw AppError.badRequest('This booking is already cancelled.');
    }

    if (booking.status === BookingStatus.FAILED) {
      throw AppError.badRequest('Cannot cancel a booking that has already failed.');
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
      },
      include: {
        centre: { select: { id: true, name: true } },
        test: { select: { id: true, name: true } },
      },
    });

    return updated;
  }
}

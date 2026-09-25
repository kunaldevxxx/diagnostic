import { Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { BookingStatus } from '@prisma/client';

export class BookingController {
  static async createBooking(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const booking = await BookingService.createBooking({
        ...req.body,
        userId: req.user!.userId,
      });

      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Diagnostic test booked successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserBookings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { status, page, limit } = req.query;
      const result = await BookingService.getUserBookings({
        userId: req.user!.userId,
        status: status as BookingStatus,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'User bookings retrieved successfully',
        data: result.bookings,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookingById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.params;
      const booking = await BookingService.getBookingById(
        id,
        req.user!.userId,
        req.user!.role
      );

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Booking details retrieved successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.params;
      const booking = await BookingService.cancelBooking(
        id,
        req.user!.userId,
        req.user!.role
      );

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Booking cancelled successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }
}

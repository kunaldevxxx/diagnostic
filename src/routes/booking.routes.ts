import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createBookingSchema,
  queryBookingsSchema,
  bookingIdParamSchema,
} from '../validators/booking.validator';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

router.post('/', validate(createBookingSchema), BookingController.createBooking);
router.get('/', validate(queryBookingsSchema), BookingController.getUserBookings);
router.get('/:id', validate(bookingIdParamSchema), BookingController.getBookingById);
router.patch('/:id/cancel', validate(bookingIdParamSchema), BookingController.cancelBooking);

export default router;

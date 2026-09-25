import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { WebhookService } from '../services/webhook.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PaymentController {
  static async processPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { bookingId, simulateOutcome, paymentMethod } = req.body;

      const result = await PaymentService.processPayment({
        bookingId,
        userId: req.user!.userId,
        role: req.user!.role,
        simulateOutcome,
        paymentMethod,
      });

      return ApiResponse.success({
        res,
        statusCode: 200,
        message:
          result.paymentStatus === 'SUCCESS'
            ? 'Payment processed successfully and booking confirmed'
            : 'Payment failed and booking marked as failed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const result = await WebhookService.handleWebhook({
        eventId: req.body.eventId,
        eventType: req.body.eventType,
        data: req.body.data,
        rawPayload: req.body,
      });

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

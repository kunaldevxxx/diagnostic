import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  simulatePaymentSchema,
  webhookPayloadSchema,
} from '../validators/payment.validator';

const router = Router();

// Simulated payment processing (requires authenticated patient)
router.post('/', authenticate, validate(simulatePaymentSchema), PaymentController.processPayment);

// Idempotent Payment Webhook (called by payment gateway provider)
router.post('/webhook', validate(webhookPayloadSchema), PaymentController.handleWebhook);

export default router;

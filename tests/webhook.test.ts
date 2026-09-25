import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    webhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback) =>
      await callback({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: '33333333-3333-3333-3333-333333333333',
            amount: 750.0,
            status: 'PENDING',
          }),
          update: jest.fn().mockResolvedValue({
            id: '33333333-3333-3333-3333-333333333333',
            status: 'CONFIRMED',
          }),
        },
        payment: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'pay-uuid-wh',
            amount: 750.0,
            status: 'SUCCESS',
            transactionId: 'TXN_TEST_WH_01',
          }),
        },
        webhookEvent: {
          create: jest.fn().mockResolvedValue({
            eventId: 'evt_test_123',
            status: 'PROCESSED',
          }),
        },
      })
    ),
  },
}));

describe('Payment Webhook API Endpoints (Idempotency)', () => {
  const bookingId = '33333333-3333-3333-3333-333333333333';
  const eventId = 'evt_test_123456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /payments/webhook/', () => {
    it('should process a first-time webhook event and update booking to CONFIRMED', async () => {
      // First time: event does NOT exist yet
      (prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/payments/webhook/')
        .send({
          eventId,
          eventType: 'payment.succeeded',
          data: {
            bookingId,
            status: 'SUCCESS',
            amount: 750.0,
            transactionId: 'TXN_TEST_WH_01',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDuplicate).toBe(false);
      expect(res.body.data.status).toBe('processed');
      expect(res.body.data.eventId).toBe(eventId);
    });

    it('IDEMPOTENCY: should safely ignore duplicate webhook events without modifying state', async () => {
      // Duplicate delivery: event ALREADY recorded in DB
      const pastProcessedDate = new Date('2026-09-25T10:00:00Z');
      (prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
        eventId,
        eventType: 'payment.succeeded',
        bookingId,
        status: 'PROCESSED',
        processedAt: pastProcessedDate,
      });

      const res = await request(app)
        .post('/payments/webhook/')
        .send({
          eventId,
          eventType: 'payment.succeeded',
          data: {
            bookingId,
            status: 'SUCCESS',
            amount: 750.0,
            transactionId: 'TXN_TEST_WH_01',
          },
        });

      // Must return 200 OK to the gateway so it stops retrying
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDuplicate).toBe(true);
      expect(res.body.data.status).toBe('ignored');
      expect(res.body.message).toContain('Idempotent response');

      // Crucial: $transaction must NOT have been called for duplicate event!
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject webhook request with invalid payload structure (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/payments/webhook/')
        .send({
          // missing eventId and eventType
          data: {
            bookingId,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should handle webhook for non-existent booking gracefully', async () => {
      (prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          booking: {
            findUnique: jest.fn().mockResolvedValue(null), // booking not found
          },
          webhookEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await request(app)
        .post('/payments/webhook/')
        .send({
          eventId: 'evt_invalid_booking',
          eventType: 'payment.succeeded',
          data: {
            bookingId: '99999999-9999-9999-9999-999999999999',
            status: 'SUCCESS',
          },
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });
});

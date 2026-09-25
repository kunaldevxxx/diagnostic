import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { generateToken } from '../src/utils/jwt';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback) =>
      await callback({
        payment: {
          create: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              id: 'pay-uuid-1',
              ...data,
            })
          ),
        },
        booking: {
          update: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              id: 'book-uuid-1',
              status: data.status,
              centre: { id: 'centre-1', name: 'Apex Centre' },
              test: { id: 'test-1', name: 'CBC Test' },
            })
          ),
        },
      })
    ),
  },
}));

describe('Simulated Payment API Endpoints', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = '22222222-2222-2222-2222-222222222222';
  const bookingId = '33333333-3333-3333-3333-333333333333';
  const validToken = generateToken({
    userId,
    email: 'patient@example.com',
    role: 'USER',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /payments/', () => {
    it('should process payment successfully and confirm booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        amount: 500.0,
        status: 'PENDING',
        centre: { id: 'c1', name: 'Centre 1' },
        test: { id: 't1', name: 'Test 1' },
      });

      const res = await request(app)
        .post('/payments/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          bookingId,
          simulateOutcome: 'SUCCESS',
          paymentMethod: 'UPI',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentStatus).toBe('SUCCESS');
      expect(res.body.data.bookingStatus).toBe('CONFIRMED');
      expect(res.body.data.transactionId).toBeDefined();
    });

    it('should simulate failed payment and update booking status to FAILED', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        amount: 500.0,
        status: 'PENDING',
        centre: { id: 'c1', name: 'Centre 1' },
        test: { id: 't1', name: 'Test 1' },
      });

      const res = await request(app)
        .post('/payments/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          bookingId,
          simulateOutcome: 'FAILED',
          paymentMethod: 'CARD',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentStatus).toBe('FAILED');
      expect(res.body.data.bookingStatus).toBe('FAILED');
    });

    it('should reject payment if booking is already CONFIRMED (400 Bad Request)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        amount: 500.0,
        status: 'CONFIRMED',
        centre: { id: 'c1', name: 'Centre 1' },
        test: { id: 't1', name: 'Test 1' },
      });

      const res = await request(app)
        .post('/payments/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          bookingId,
          simulateOutcome: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already paid and confirmed');
    });

    it('should reject payment if booking is CANCELLED (400 Bad Request)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        amount: 500.0,
        status: 'CANCELLED',
        centre: { id: 'c1', name: 'Centre 1' },
        test: { id: 't1', name: 'Test 1' },
      });

      const res = await request(app)
        .post('/payments/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          bookingId,
          simulateOutcome: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot process payment for a cancelled booking');
    });

    it('should reject payment if user does not own the booking (403 Forbidden)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId: otherUserId, // different user
        amount: 500.0,
        status: 'PENDING',
        centre: { id: 'c1', name: 'Centre 1' },
        test: { id: 't1', name: 'Test 1' },
      });

      const res = await request(app)
        .post('/payments/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          bookingId,
          simulateOutcome: 'SUCCESS',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');
    });

    it('should return 404 if booking is not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/payments/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          bookingId,
          simulateOutcome: 'SUCCESS',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});

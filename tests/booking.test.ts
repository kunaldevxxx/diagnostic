import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { generateToken } from '../src/utils/jwt';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    centreTest: {
      findUnique: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Booking API Endpoints', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = '22222222-2222-2222-2222-222222222222';
  const validToken = generateToken({
    userId,
    email: 'patient@example.com',
    role: 'USER',
  });

  const centreId = '33333333-3333-3333-3333-333333333333';
  const testId = '44444444-4444-4444-4444-444444444444';
  const bookingId = '55555555-5555-5555-5555-555555555555';

  const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day in past

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bookings', () => {
    it('should create a booking with status PENDING', async () => {
      (prisma.centreTest.findUnique as jest.Mock).mockResolvedValue({
        centreId,
        testId,
        price: 450.0,
        isAvailable: true,
      });

      (prisma.booking.create as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        centreId,
        testId,
        appointmentDate: new Date(futureDate),
        amount: 450.0,
        status: 'PENDING',
        centre: { id: centreId, name: 'Apex Centre' },
        test: { id: testId, name: 'CBC Test' },
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          centreId,
          testId,
          appointmentDate: futureDate,
          notes: 'Morning appointment preferred',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.amount).toBe(450.0);
    });

    it('should reject booking when appointment date is in the past (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          centreId,
          testId,
          appointmentDate: pastDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toContain('future');
    });

    it('should reject booking if centre does not offer requested test (400 Bad Request)', async () => {
      (prisma.centreTest.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          centreId,
          testId,
          appointmentDate: futureDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('does not offer the requested test');
    });

    it('should reject booking if unauthenticated (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          centreId,
          testId,
          appointmentDate: futureDate,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should return booking if user owns it', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        status: 'PENDING',
        amount: 450.0,
      });

      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(bookingId);
    });

    it('should forbid user from accessing another user booking (403 Forbidden)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId: otherUserId, // belongs to someone else
        status: 'PENDING',
      });

      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have permission');
    });

    it('should return 404 for non-existent booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/bookings/:id/cancel', () => {
    it('should cancel a PENDING booking successfully', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        status: 'PENDING',
      });

      (prisma.booking.update as jest.Mock).mockResolvedValue({
        id: bookingId,
        status: 'CANCELLED',
      });

      const res = await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should reject cancelling an already CANCELLED booking (400 Bad Request)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        status: 'CANCELLED',
      });

      const res = await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already cancelled');
    });

    it('should reject cancelling an already FAILED booking (400 Bad Request)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: bookingId,
        userId,
        status: 'FAILED',
      });

      const res = await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already failed');
    });
  });
});

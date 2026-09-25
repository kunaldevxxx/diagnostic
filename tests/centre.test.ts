import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    diagnosticCentre: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    diagnosticTest: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    centreTest: {
      upsert: jest.fn(),
    },
  },
}));

describe('Diagnostic Centres & Tests API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCentres = [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      name: 'Apex Diagnostic Centre',
      location: '123 Health Ave, Bandra',
      city: 'Mumbai',
      contactPhone: '+919876500000',
      email: 'apex@example.com',
      _count: { centreTests: 4 },
    },
  ];

  describe('GET /api/centres', () => {
    it('should list centres with pagination metadata', async () => {
      (prisma.diagnosticCentre.count as jest.Mock).mockResolvedValue(1);
      (prisma.diagnosticCentre.findMany as jest.Mock).mockResolvedValue(mockCentres);

      const res = await request(app).get('/api/centres?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Apex Diagnostic Centre');
      expect(res.body.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should support search query parameter', async () => {
      (prisma.diagnosticCentre.count as jest.Mock).mockResolvedValue(1);
      (prisma.diagnosticCentre.findMany as jest.Mock).mockResolvedValue(mockCentres);

      const res = await request(app).get('/api/centres?search=Apex&city=Mumbai');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.diagnosticCentre.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Mumbai', mode: 'insensitive' },
          }),
        })
      );
    });
  });

  describe('GET /api/centres/:id', () => {
    it('should return centre details with available tests and pricing', async () => {
      const mockCentreWithTests = {
        id: 'b1111111-1111-1111-1111-111111111111',
        name: 'Apex Diagnostic Centre',
        location: '123 Health Ave, Bandra',
        city: 'Mumbai',
        contactPhone: '+919876500000',
        email: 'apex@example.com',
        centreTests: [
          {
            price: 400.0,
            isAvailable: true,
            test: {
              id: 'c1111111-1111-1111-1111-111111111111',
              name: 'Complete Blood Count (CBC)',
              category: 'Pathology',
              description: 'Routine blood test',
              sampleRequired: 'Blood',
              turnaroundTime: '12 hours',
            },
          },
        ],
      };

      (prisma.diagnosticCentre.findUnique as jest.Mock).mockResolvedValue(mockCentreWithTests);

      const res = await request(app).get(
        '/api/centres/b1111111-1111-1111-1111-111111111111'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Apex Diagnostic Centre');
      expect(res.body.data.availableTests).toHaveLength(1);
      expect(res.body.data.availableTests[0].price).toBe(400.0);
    });

    it('should return 404 if centre is not found', async () => {
      (prisma.diagnosticCentre.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get(
        '/api/centres/b1111111-1111-1111-1111-111111111111'
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if centre ID is not a valid UUID', async () => {
      const res = await request(app).get('/api/centres/invalid-uuid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/centres/tests', () => {
    it('should retrieve diagnostic test catalog', async () => {
      const mockTests = [
        {
          id: 'c1111111-1111-1111-1111-111111111111',
          name: 'Complete Blood Count (CBC)',
          category: 'Pathology',
          basePrice: 350.0,
        },
      ];

      (prisma.diagnosticTest.findMany as jest.Mock).mockResolvedValue(mockTests);

      const res = await request(app).get('/api/centres/tests');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Complete Blood Count (CBC)');
    });
  });
});

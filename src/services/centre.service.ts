import { prisma } from '../config/prisma';
import { AppError } from '../utils/apiError';

export interface CentreFilterQuery {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
}

export class CentreService {
  static async getAllCentres(query: CentreFilterQuery) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, centres] = await Promise.all([
      prisma.diagnosticCentre.count({ where }),
      prisma.diagnosticCentre.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { centreTests: { where: { isAvailable: true } } },
          },
        },
      }),
    ]);

    const formattedCentres = centres.map((centre) => ({
      ...centre,
      availableTestsCount: centre._count.centreTests,
    }));

    return {
      centres: formattedCentres,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCentreById(id: string) {
    const centre = await prisma.diagnosticCentre.findUnique({
      where: { id },
      include: {
        centreTests: {
          where: { isAvailable: true },
          include: {
            test: true,
          },
        },
      },
    });

    if (!centre) {
      throw AppError.notFound(`Diagnostic centre with ID "${id}" was not found.`);
    }

    const formattedTests = centre.centreTests.map((ct) => ({
      testId: ct.test.id,
      name: ct.test.name,
      category: ct.test.category,
      description: ct.test.description,
      sampleRequired: ct.test.sampleRequired,
      turnaroundTime: ct.test.turnaroundTime,
      price: ct.price,
      isAvailable: ct.isAvailable,
    }));

    return {
      id: centre.id,
      name: centre.name,
      location: centre.location,
      city: centre.city,
      contactPhone: centre.contactPhone,
      email: centre.email,
      availableTests: formattedTests,
    };
  }

  static async createCentre(data: {
    name: string;
    location: string;
    city: string;
    contactPhone?: string;
    email?: string;
  }) {
    return prisma.diagnosticCentre.create({
      data,
    });
  }

  static async getAllTests() {
    return prisma.diagnosticTest.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async createTest(data: {
    name: string;
    category: string;
    description?: string;
    sampleRequired?: string;
    turnaroundTime?: string;
    basePrice?: number;
  }) {
    return prisma.diagnosticTest.create({
      data,
    });
  }

  static async addTestToCentre(
    centreId: string,
    testId: string,
    price: number,
    isAvailable = true
  ) {
    const [centre, test] = await Promise.all([
      prisma.diagnosticCentre.findUnique({ where: { id: centreId } }),
      prisma.diagnosticTest.findUnique({ where: { id: testId } }),
    ]);

    if (!centre) {
      throw AppError.notFound(`Diagnostic centre with ID "${centreId}" was not found.`);
    }
    if (!test) {
      throw AppError.notFound(`Diagnostic test with ID "${testId}" was not found.`);
    }

    return prisma.centreTest.upsert({
      where: {
        centreId_testId: {
          centreId,
          testId,
        },
      },
      update: {
        price,
        isAvailable,
      },
      create: {
        centreId,
        testId,
        price,
        isAvailable,
      },
      include: {
        centre: true,
        test: true,
      },
    });
  }
}

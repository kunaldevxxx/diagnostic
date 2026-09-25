import { z } from 'zod';

export const createCentreSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Centre name is required' }).min(2).max(150).trim(),
    location: z.string({ required_error: 'Location/Address is required' }).min(3).trim(),
    city: z.string({ required_error: 'City is required' }).min(2).trim(),
    contactPhone: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

export const createTestSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Test name is required' }).min(2).max(150).trim(),
    category: z.string({ required_error: 'Category is required' }).min(2).trim(),
    description: z.string().optional(),
    sampleRequired: z.string().optional(),
    turnaroundTime: z.string().optional(),
    basePrice: z.number().min(0, 'Base price must be positive').default(0.0),
  }),
});

export const addCentreTestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid centre ID format'),
  }),
  body: z.object({
    testId: z.string().uuid('Invalid test ID format'),
    price: z.number({ required_error: 'Price is required' }).positive('Price must be greater than 0'),
    isAvailable: z.boolean().optional().default(true),
  }),
});

export const queryCentresSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    city: z.string().optional(),
    page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10)),
  }),
});

export const centreIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid centre ID format'),
  }),
});

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'EVE Healthcare — Diagnostic Test Booking & Payment Service',
    version: '1.0.0',
    description:
      '',
    contact: {
      name: 'EVE Healthcare Backend Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token (obtained from /api/auth/login or /api/auth/signup)',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      UserSignup: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'Aarav Sharma' },
          email: { type: 'string', format: 'email', example: 'aarav@example.com' },
          password: { type: 'string', format: 'password', example: 'Password123' },
          phone: { type: 'string', example: '+919876543210' },
        },
      },
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'aarav@example.com' },
          password: { type: 'string', format: 'password', example: 'Password123' },
        },
      },
      DiagnosticCentre: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Apex Diagnostic Centre' },
          location: { type: 'string', example: '123 Health Ave, Andheri East' },
          city: { type: 'string', example: 'Mumbai' },
          contactPhone: { type: 'string', example: '+919876500000' },
          availableTestsCount: { type: 'integer', example: 5 },
        },
      },
      CreateBooking: {
        type: 'object',
        required: ['centreId', 'testId', 'appointmentDate'],
        properties: {
          centreId: { type: 'string', format: 'uuid' },
          testId: { type: 'string', format: 'uuid' },
          appointmentDate: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-15T09:30:00.000Z',
          },
          notes: { type: 'string', example: 'Fasting 12 hours before test' },
        },
      },
      SimulatePayment: {
        type: 'object',
        required: ['bookingId'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          simulateOutcome: {
            type: 'string',
            enum: ['SUCCESS', 'FAILED'],
            example: 'SUCCESS',
          },
          paymentMethod: { type: 'string', example: 'UPI' },
        },
      },
      WebhookPayload: {
        type: 'object',
        required: ['eventId', 'eventType', 'data'],
        properties: {
          eventId: { type: 'string', example: 'evt_sim_982347102' },
          eventType: { type: 'string', example: 'payment.succeeded' },
          data: {
            type: 'object',
            required: ['bookingId', 'status'],
            properties: {
              bookingId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
              amount: { type: 'number', example: 750 },
              transactionId: { type: 'string', example: 'TXN_GATEWAY_48291' },
              paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/auth/signup': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSignup' } } },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Log in with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserLogin' } } },
        },
        responses: {
          200: { description: 'Login successful with JWT token' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/centres': {
      get: {
        summary: 'List diagnostic centres with search and pagination',
        tags: ['Diagnostic Centres & Tests'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or location' },
          { name: 'city', in: 'query', schema: { type: 'string' }, description: 'Filter by city' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'List of centres' },
        },
      },
      post: {
        summary: 'Create a new diagnostic centre',
        tags: ['Diagnostic Centres & Tests'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'location', 'city'],
                properties: {
                  name: { type: 'string' },
                  location: { type: 'string' },
                  city: { type: 'string' },
                  contactPhone: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Centre created successfully' },
        },
      },
    },
    '/api/centres/{id}': {
      get: {
        summary: 'Get diagnostic centre details and available tests with pricing',
        tags: ['Diagnostic Centres & Tests'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Centre details and tests' },
          404: { description: 'Centre not found' },
        },
      },
    },
    '/api/centres/tests': {
      get: {
        summary: 'List all diagnostic tests in catalogue',
        tags: ['Diagnostic Centres & Tests'],
        responses: {
          200: { description: 'All diagnostic tests' },
        },
      },
    },
    '/api/centres/{id}/tests': {
      post: {
        summary: 'Assign a test to a centre with custom pricing',
        tags: ['Diagnostic Centres & Tests'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['testId', 'price'],
                properties: {
                  testId: { type: 'string', format: 'uuid' },
                  price: { type: 'number', minimum: 0.1 },
                  isAvailable: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Test linked to centre successfully' },
        },
      },
    },
    '/api/bookings': {
      post: {
        summary: 'Book a diagnostic test',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBooking' } } },
        },
        responses: {
          201: { description: 'Booking created with PENDING status' },
          400: { description: 'Validation failed or past appointment date' },
        },
      },
      get: {
        summary: 'Get bookings for current logged-in user',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'User bookings' },
        },
      },
    },
    '/api/bookings/{id}': {
      get: {
        summary: 'Get booking details by ID',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Booking details' },
          403: { description: 'Unauthorized access to another user booking' },
          404: { description: 'Booking not found' },
        },
      },
    },
    '/api/bookings/{id}/cancel': {
      patch: {
        summary: 'Cancel an existing booking',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Booking cancelled' },
          400: { description: 'Cannot cancel already cancelled or failed booking' },
        },
      },
    },
    '/payments/': {
      post: {
        summary: 'Simulate payment processing for a booking',
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SimulatePayment' } } },
        },
        responses: {
          200: { description: 'Simulated payment completed and booking status updated' },
          400: { description: 'Booking already confirmed or cancelled' },
          404: { description: 'Booking not found' },
        },
      },
    },
    '/payments/webhook/': {
      post: {
        summary: 'Idempotent Payment Webhook endpoint from payment provider',
        tags: ['Payments'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookPayload' } } },
        },
        responses: {
          200: { description: 'Webhook processed or duplicate ignored idempotently' },
          400: { description: 'Invalid webhook payload structure' },
          404: { description: 'Booking not found' },
        },
      },
    },
  },
};

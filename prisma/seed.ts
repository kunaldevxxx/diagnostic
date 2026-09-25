import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EVE Healthcare Database Seeding...');

  // Clean existing data in reverse order of foreign keys
  await prisma.webhookEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.centreTest.deleteMany({});
  await prisma.diagnosticTest.deleteMany({});
  await prisma.diagnosticCentre.deleteMany({});
  await prisma.user.deleteMany({});

  console.log(' Cleared old records.');

  // 1. Seed Users
  const salt = await bcrypt.genSalt(10);
  const patientHash = await bcrypt.hash('Password123', salt);
  const adminHash = await bcrypt.hash('AdminPassword123', salt);

  const testUser = await prisma.user.create({
    data: {
      email: 'patient@evehealthcare.com',
      fullName: 'Priya Sharma',
      passwordHash: patientHash,
      phone: '+919876543210',
      role: Role.USER,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@evehealthcare.com',
      fullName: 'Dr. Vikram Malhotra',
      passwordHash: adminHash,
      phone: '+919876500001',
      role: Role.ADMIN,
    },
  });

  console.log(` Created test user: ${testUser.email} (Password123)`);
  console.log(` Created admin user: ${adminUser.email} (AdminPassword123)`);

  // 2. Seed Diagnostic Centres
  const centresData = [
    {
      name: 'Apex Diagnostic & Imaging Centre',
      location: 'Plot 42, Linking Road, Bandra West',
      city: 'Mumbai',
      contactPhone: '+912226401122',
      email: 'contact@apexdiagnostic.in',
    },
    {
      name: 'Metropolis Healthcare Centre',
      location: '15 Barakhamba Road, Connaught Place',
      city: 'Delhi',
      contactPhone: '+911145678900',
      email: 'cp@metropolis.in',
    },
    {
      name: 'Apollo Diagnostics Hub',
      location: '80 Feet Road, 4th Block, Koramangala',
      city: 'Bengaluru',
      contactPhone: '+918025531234',
      email: 'koramangala@apollodiagnostics.in',
    },
    {
      name: 'CarePlus Diagnostic Labs',
      location: 'Road No. 12, Banjara Hills',
      city: 'Hyderabad',
      contactPhone: '+914023356789',
      email: 'banjara@carepluslabs.in',
    },
  ];

  const centres = [];
  for (const c of centresData) {
    const centre = await prisma.diagnosticCentre.create({ data: c });
    centres.push(centre);
  }
  console.log(` Created ${centres.length} diagnostic centres.`);

  // 3. Seed Diagnostic Tests Catalogue
  const testsData = [
    {
      name: 'Complete Blood Count (CBC)',
      category: 'Pathology',
      description: 'Measures red blood cells, white blood cells, platelets, and hemoglobin levels.',
      sampleRequired: 'Blood (EDTA)',
      turnaroundTime: '8-12 hours',
      basePrice: 350.0,
    },
    {
      name: 'Lipid Profile Comprehensive',
      category: 'Biochemistry',
      description: 'Assesses total cholesterol, HDL, LDL, VLDL, and triglycerides. Helps evaluate cardiovascular risk.',
      sampleRequired: 'Blood (10-12 hours fasting required)',
      turnaroundTime: '12-24 hours',
      basePrice: 750.0,
    },
    {
      name: 'Thyroid Total Profile (T3, T4, TSH)',
      category: 'Endocrinology',
      description: 'Evaluates thyroid gland function to diagnose hypo/hyperthyroidism.',
      sampleRequired: 'Blood serum',
      turnaroundTime: '12-24 hours',
      basePrice: 600.0,
    },
    {
      name: 'HbA1c (Glycated Hemoglobin)',
      category: 'Diabetes Care',
      description: 'Provides an average of your blood glucose levels over the past 2-3 months.',
      sampleRequired: 'Blood (Whole blood)',
      turnaroundTime: '8-12 hours',
      basePrice: 450.0,
    },
    {
      name: 'Vitamin D (25-OH) & B12 Duo',
      category: 'Wellness & Immunity',
      description: 'Detects vitamin deficiencies affecting bone health, nerves, and energy levels.',
      sampleRequired: 'Blood serum',
      turnaroundTime: '24 hours',
      basePrice: 1200.0,
    },
    {
      name: 'Liver Function Test (LFT)',
      category: 'Biochemistry',
      description: 'Measures enzymes, proteins, and bilirubin to screen for liver damage or inflammation.',
      sampleRequired: 'Blood serum',
      turnaroundTime: '12-24 hours',
      basePrice: 650.0,
    },
    {
      name: 'Kidney Function Test (KFT / RFT)',
      category: 'Biochemistry',
      description: 'Assesses serum creatinine, BUN, urea, and electrolytes to monitor renal health.',
      sampleRequired: 'Blood serum',
      turnaroundTime: '12-24 hours',
      basePrice: 650.0,
    },
    {
      name: 'Chest X-Ray (PA View)',
      category: 'Radiology',
      description: 'Radiological examination of lungs, heart, and chest wall.',
      sampleRequired: 'No fasting required',
      turnaroundTime: '2-4 hours',
      basePrice: 500.0,
    },
  ];

  const tests = [];
  for (const t of testsData) {
    const test = await prisma.diagnosticTest.create({ data: t });
    tests.push(test);
  }
  console.log(` Created ${tests.length} diagnostic tests.`);

  // 4. Map Tests to Centres with Centre-Specific Pricing
  let centreTestCount = 0;
  for (const centre of centres) {
    // Each centre offers tests with a slight price variation (+/- 10%)
    for (const test of tests) {
      const priceVariation = Math.round((test.basePrice * (0.95 + Math.random() * 0.15)) / 10) * 10;
      await prisma.centreTest.create({
        data: {
          centreId: centre.id,
          testId: test.id,
          price: priceVariation,
          isAvailable: true,
        },
      });
      centreTestCount++;
    }
  }
  console.log(` Linked ${centreTestCount} centre-test offerings.`);

  // 5. Create a sample initial booking for Priya
  const sampleAppointment = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days in future
  const sampleCentre = centres[0];
  const sampleTest = tests[0];

  const sampleBooking = await prisma.booking.create({
    data: {
      userId: testUser.id,
      centreId: sampleCentre.id,
      testId: sampleTest.id,
      appointmentDate: sampleAppointment,
      amount: 380.0,
      status: 'PENDING',
      notes: 'Please arrange morning slot.',
    },
  });
  console.log(` Created sample pending booking for Priya: ID ${sampleBooking.id}`);

  console.log('✅ Database Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

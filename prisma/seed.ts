import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const CAMPUSES = [
  { name: 'University of Lagos', code: 'UNILAG', location: 'Lagos, Nigeria' },
  { name: 'University of Ibadan', code: 'UI', location: 'Ibadan, Oyo State' },
  { name: 'Obafemi Awolowo University', code: 'OAU', location: 'Ile-Ife, Osun State' },
  { name: 'University of Nigeria, Nsukka', code: 'UNN', location: 'Nsukka, Enugu State' },
  { name: 'Ahmadu Bello University', code: 'ABU', location: 'Zaria, Kaduna State' },
  { name: 'University of Benin', code: 'UNIBEN', location: 'Benin City, Edo State' },
  { name: 'Lagos State University', code: 'LASU', location: 'Ojo, Lagos' },
  { name: 'Covenant University', code: 'CU', location: 'Ota, Ogun State' },
  { name: 'Federal University of Technology, Akure', code: 'FUTA', location: 'Akure, Ondo State' },
  { name: 'University of Port Harcourt', code: 'UNIPORT', location: 'Port Harcourt, Rivers State' },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Seeding campuses...');

  for (const campus of CAMPUSES) {
    await prisma.campus.upsert({
      where: { code: campus.code },
      update: {
        name: campus.name,
        location: campus.location,
      },
      create: campus,
    });
    console.log(`  ✓ ${campus.name} (${campus.code})`);
  }

  console.log('✅ Seeding complete!');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});

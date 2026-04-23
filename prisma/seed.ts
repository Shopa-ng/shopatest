import { PrismaClient, UserRole, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Campus ───────────────────────────────────────────────────────────────
  const campus = await prisma.campus.upsert({
    where: { code: 'CRAWFORD' },
    update: {},
    create: {
      name: 'Crawford University',
      code: 'CRAWFORD',
      location: 'Igbesa, Ogun State',
      isActive: true,
    },
  });
  console.log(`✅ Campus: ${campus.name}`);

  // ─── Categories ───────────────────────────────────────────────────────────
  const categoryData = [
    { name: 'Clothing & Accessories', description: 'Clothes, shoes, accessories and fashion', icon: '👗' },
{ name: 'Body care & Beauty', description: 'Skincare, haircare, makeup and fragrances', icon: '💄' },
{ name: 'Gadgets & Accessories', description: 'Phones, laptops, earphones and accessories', icon: '📱' },
{ name: 'Provisions', description: 'Cereal, beverages, snacks and confectioneries', icon: '🛒' },
{ name: 'Sports', description: 'Sports equipment, sportswear and accessories', icon: '⚽' },
{ name: 'Stationery', description: 'Books, school supplies and stationery', icon: '📓' },
{ name: 'Others', description: 'Everything else', icon: '🛍️' },
  ];

  const categories = await Promise.all(
    categoryData.map((cat) =>
      prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      })
    )
  );
  console.log(`✅ Categories: ${categories.length} created`);

  // ─── Admin User ───────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shopa.ng' },
    update: {},
    create: {
      email: 'admin@shopa.ng',
      password: adminPassword,
      firstName: 'Shopa',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isVerified: true,
      isEmailVerified: true,
      verificationStatus: VerificationStatus.APPROVED,
      campusId: campus.id,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Vendor User ──────────────────────────────────────────────────────────
  const vendorPassword = await bcrypt.hash('Vendor@1234', 10);
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@shopa.ng' },
    update: {},
    create: {
      email: 'vendor@shopa.ng',
      password: vendorPassword,
      firstName: 'Test',
      lastName: 'Vendor',
      role: UserRole.VENDOR,
      isVerified: true,
      isEmailVerified: true,
      verificationStatus: VerificationStatus.APPROVED,
      campusId: campus.id,
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      storeName: 'Campus Eats',
      description: 'Your favourite food spot on campus',
      verificationStatus: VerificationStatus.APPROVED,
      userId: vendorUser.id,
    },
  });
  console.log(`✅ Vendor: ${vendor.storeName}`);

  // ─── Test Customer ────────────────────────────────────────────────────────
  const customerPassword = await bcrypt.hash('Student@1234', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'student@shopa.ng' },
    update: {},
    create: {
      email: 'student@shopa.ng',
      password: customerPassword,
      firstName: 'Test',
      lastName: 'Student',
      role: UserRole.STUDENT,
      isVerified: true,
      isEmailVerified: true,
      verificationStatus: VerificationStatus.APPROVED,
      campusId: campus.id,
    },
  });
  console.log(`✅ Customer: ${customer.email}`);

  // ─── Products ─────────────────────────────────────────────────────────────
  const foodCategory = categories.find((c) => c.name === 'Provisions')!;
  const electronicsCategory = categories.find((c) => c.name === 'Gadgets & Accessories')!;
  const fashionCategory = categories.find((c) => c.name === 'Clothing & Accessories')!;

  const productsData = [
    {
      name: 'Jollof Rice & Chicken',
      description: 'Delicious Nigerian jollof rice served with grilled chicken',
      price: 1500,
      stock: 50,
      categoryId: foodCategory.id,
      images: [],
    },
    {
      name: 'Shawarma (Large)',
      description: 'Freshly made chicken shawarma with coleslaw and sauce',
      price: 2000,
      stock: 30,
      categoryId: foodCategory.id,
      images: [],
    },
    {
      name: 'Chapman Drink',
      description: 'Chilled chapman cocktail, perfect for the heat',
      price: 800,
      stock: 100,
      categoryId: foodCategory.id,
      images: [],
    },
    {
      name: 'Phone Charging Cable (USB-C)',
      description: 'Fast charging USB-C cable, 1.2m length',
      price: 1200,
      stock: 20,
      categoryId: electronicsCategory.id,
      images: [],
    },
    {
      name: 'Wireless Earbuds',
      description: 'Budget-friendly wireless earbuds with good sound quality',
      price: 8500,
      stock: 15,
      categoryId: electronicsCategory.id,
      images: [],
    },
    {
      name: 'Ankara Tote Bag',
      description: 'Handmade Ankara print tote bag, perfect for lectures',
      price: 3500,
      stock: 25,
      categoryId: fashionCategory.id,
      images: [],
    },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.create({
        data: {
          ...p,
          price: p.price,
          vendorId: vendor.id,
          campusId: campus.id,
        },
      })
    )
  );
  console.log(`✅ Products: ${products.length} created`);

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────');
  console.log('Test credentials:');
  console.log('  Admin:    admin@shopa.ng    / Admin@1234');
  console.log('  Vendor:   vendor@shopa.ng   / Vendor@1234');
  console.log('  Student:  student@shopa.ng  / Student@1234');
  console.log('─────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

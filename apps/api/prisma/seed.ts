import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const defaultCategories = [
  { name: 'Groceries/Kirana', icon: 'shopping-cart', isDefault: true },
  { name: 'Rent', icon: 'home', isDefault: true },
  { name: 'Utilities', icon: 'zap', isDefault: true },
  { name: 'Transport', icon: 'car', isDefault: true },
  { name: 'Medical/Health', icon: 'heart-pulse', isDefault: true },
  { name: 'Education', icon: 'graduation-cap', isDefault: true },
  { name: 'Dining Out', icon: 'utensils', isDefault: true },
  { name: 'Entertainment', icon: 'film', isDefault: true },
  { name: 'Shopping', icon: 'shopping-bag', isDefault: true },
  { name: 'EMI/Loans', icon: 'landmark', isDefault: true },
  { name: 'Household Help', icon: 'hand-helping', isDefault: true },
  { name: 'Mobile/Internet', icon: 'wifi', isDefault: true },
];

async function main() {
  const existing = await prisma.category.count({
    where: { isDefault: true },
  });

  if (existing === 0) {
    await prisma.category.createMany({ data: defaultCategories });
    console.log(`Seeded ${defaultCategories.length} default categories`);
  } else {
    console.log(`Default categories already exist (${existing}), skipping`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

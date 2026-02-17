import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const defaultCategories = [
  { name: 'Groceries/Kirana', icon: '🛒', isDefault: true },
  { name: 'Rent', icon: '🏠', isDefault: true },
  { name: 'Utilities', icon: '⚡', isDefault: true },
  { name: 'Transport', icon: '🚗', isDefault: true },
  { name: 'Medical/Health', icon: '🏥', isDefault: true },
  { name: 'Education', icon: '🎓', isDefault: true },
  { name: 'Dining Out', icon: '🍽️', isDefault: true },
  { name: 'Entertainment', icon: '🎬', isDefault: true },
  { name: 'Shopping', icon: '🛍️', isDefault: true },
  { name: 'EMI/Loans', icon: '🏦', isDefault: true },
  { name: 'Household Help', icon: '🤝', isDefault: true },
  { name: 'Mobile/Internet', icon: '📶', isDefault: true },
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
    await pool.end();
  });

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const iconToEmoji: Record<string, string> = {
  'shopping-cart': '🛒',
  home: '🏠',
  zap: '⚡',
  car: '🚗',
  'heart-pulse': '🏥',
  'graduation-cap': '🎓',
  utensils: '🍽️',
  film: '🎬',
  'shopping-bag': '🛍️',
  landmark: '🏦',
  'hand-helping': '🤝',
  wifi: '📶',
};

async function main() {
  const categories = await prisma.category.findMany({
    where: { icon: { in: Object.keys(iconToEmoji) } },
  });

  console.log(`Found ${categories.length} categories with Tabler icon names`);

  for (const cat of categories) {
    if (cat.icon && iconToEmoji[cat.icon]) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { icon: iconToEmoji[cat.icon] },
      });
      console.log(`  ${cat.name}: ${cat.icon} → ${iconToEmoji[cat.icon]}`);
    }
  }

  console.log('Migration complete');
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

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const g = await prisma.studyGroup.findFirst();
  console.log('Group found:', g?.id);
}
main().finally(() => prisma.$disconnect());

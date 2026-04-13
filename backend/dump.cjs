const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const g = await prisma.studyGroup.findMany({ include: { owner: true } });
  console.log(JSON.stringify(g, null, 2));
}
run();

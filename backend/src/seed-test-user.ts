import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const testUser = await prisma.user.upsert({
        where: { email: 'test_user@ucaldas.edu.co' },
        update: {},
        create: {
            id: 'test-user-id-001',
            email: 'test_user@ucaldas.edu.co',
            name: 'Usuario de Prueba',
        },
    });
    console.log('Test user created:', testUser);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

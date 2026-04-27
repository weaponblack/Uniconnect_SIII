const fs = require('fs');
const file = 'c:/Users/Julia/OneDrive/Universidad/2026-1/Software 3/Uniconnect_SIII/backend/src/modules/post/post.service.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
    `async function checkMembership(groupId: string, userId: string) {`,
    `async function checkMembership(groupId: string, userId: string, payload?: any) {`
);

code = code.replace(
    `    const authUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!authUser) throw new AppError(404, 'Usuario no encontrado en base de datos');`,
    `    let authUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!authUser && payload?.email) {
        authUser = await prisma.user.findUnique({ where: { email: payload.email } });
    }
    if (!authUser) throw new AppError(404, 'Usuario no encontrado en base de datos');
    // Ensure we process with actual CUID
    userId = authUser.id;`
);

fs.writeFileSync(file, code);

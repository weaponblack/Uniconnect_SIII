import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type { UpdateProfileInput } from './student.schemas.js';

export async function getStudentProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            career: true,
            currentSemester: true,
            subjects: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    credits: true,
                },
            },
        },
    });

    if (!user) {
        throw new AppError(404, 'User not found');
    }

    return user;
}

export async function updateStudentProfile(userId: string, data: UpdateProfileInput) {
    const { career, currentSemester, subjects } = data;

    // Process subjects: create them if they do not exist, and link them to the user.
    // Unlink subjects not in the provided list.

    if (subjects !== undefined) {
        // 1. Unlink all current subjects first
        await prisma.user.update({
            where: { id: userId },
            data: {
                subjects: {
                    set: [], // Clear relations
                },
            },
        });

        // 2. Setup the new ones, using connectOrCreate to not duplicate
        const subjectConnections = subjects.map((subjectName) => ({
            where: { name: subjectName },
            create: { name: subjectName },
        }));

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                career: career !== undefined ? career : undefined,
                currentSemester: currentSemester !== undefined ? currentSemester : undefined,
                subjects: {
                    connectOrCreate: subjectConnections,
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                career: true,
                currentSemester: true,
                subjects: true,
            },
        });

        return user;
    } else {
        // Only update primitive fields
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                career: career !== undefined ? career : undefined,
                currentSemester: currentSemester !== undefined ? currentSemester : undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                career: true,
                currentSemester: true,
                subjects: true,
            },
        });

        return user;
    }
}

export async function getAllSubjects() {
    return prisma.subject.findMany({
        orderBy: { name: 'asc' },
    });
}

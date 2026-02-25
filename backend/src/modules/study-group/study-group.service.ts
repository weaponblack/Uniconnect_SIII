import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type { CreateStudyGroupInput, UpdateStudyGroupInput, AddMembersInput } from './study-group.schemas.js';

export async function createStudyGroup(ownerId: string, data: CreateStudyGroupInput) {
    return prisma.studyGroup.create({
        data: {
            ...data,
            ownerId,
            members: {
                connect: { id: ownerId }, // The owner is automatically a member
            },
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        }
    });
}

export async function getStudentStudyGroups(studentId: string) {
    return prisma.studyGroup.findMany({
        where: {
            members: {
                some: { id: studentId }
            }
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function updateStudyGroup(groupId: string, ownerId: string, data: UpdateStudyGroupInput) {
    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });

    if (!group) throw new AppError(404, 'Study group not found');
    if (group.ownerId !== ownerId) throw new AppError(403, 'Only the owner can edit this group');

    return prisma.studyGroup.update({
        where: { id: groupId },
        data,
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        }
    });
}

export async function addMembersToGroup(groupId: string, ownerId: string, data: AddMembersInput) {
    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });

    if (!group) throw new AppError(404, 'Study group not found');
    if (group.ownerId !== ownerId) throw new AppError(403, 'Only the owner can add members');

    return prisma.studyGroup.update({
        where: { id: groupId },
        data: {
            members: {
                connect: data.memberIds.map(id => ({ id }))
            }
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        }
    });
}

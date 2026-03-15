import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type { CreateStudyGroupInput, UpdateStudyGroupInput, AddMembersInput } from './study-group.schemas.js';

export async function createStudyGroup(ownerId: string, data: CreateStudyGroupInput, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true }
        });
        if (existing) {
            dbOwnerId = existing.id;
        } else {
            // Create the user if they don't exist (e.g. first time logging in via Auth0)
            const newUser = await prisma.user.create({
                data: {
                    id: ownerId.startsWith('auth0|') ? undefined : ownerId, // Let cuid() handle it if it's an Auth0 sub
                    email: payload.email,
                    name: payload.name || payload.nickname || null,
                }
            });
            dbOwnerId = newUser.id;
        }
    }

    return prisma.studyGroup.create({
        data: {
            ...data,
            ownerId: dbOwnerId,
            members: {
                connect: { id: dbOwnerId }, // The owner is automatically a member
            },
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        }
    });
}

export async function getStudentStudyGroups(studentId: string, payload?: any) {
    let dbStudentId = studentId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true }
        });
        if (existing) {
            dbStudentId = existing.id;
        } else {
            // Create user if missing
            const newUser = await prisma.user.create({
                data: {
                    id: studentId.startsWith('auth0|') ? undefined : studentId,
                    email: payload.email,
                    name: payload.name || payload.nickname || null,
                }
            });
            dbStudentId = newUser.id;
        }
    }

    return prisma.studyGroup.findMany({
        where: {
            members: {
                some: { id: dbStudentId }
            }
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function updateStudyGroup(groupId: string, ownerId: string, data: UpdateStudyGroupInput, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true }
        });
        if (existing) dbOwnerId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });

    if (!group) throw new AppError(404, 'Study group not found');
    if (group.ownerId !== dbOwnerId) throw new AppError(403, 'Only the owner can edit this group');

    return prisma.studyGroup.update({
        where: { id: groupId },
        data,
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        }
    });
}

export async function deleteStudyGroup(groupId: string, ownerId: string, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true }
        });
        if (existing) dbOwnerId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });

    if (!group) throw new AppError(404, 'Study group not found');
    if (group.ownerId !== dbOwnerId) throw new AppError(403, 'Only the owner can delete this group');

    return prisma.studyGroup.delete({
        where: { id: groupId }
    });
}

export async function addMembersToGroup(groupId: string, ownerId: string, data: AddMembersInput, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true }
        });
        if (existing) dbOwnerId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId },
        include: { owner: true }
    });

    if (!group) throw new AppError(404, 'Study group not found');
    if (group.ownerId !== dbOwnerId) throw new AppError(403, 'Only the owner can add members');

    // Filter/Validate: only students from the same career as the owner can be added
    const studentsToAdd = await prisma.user.findMany({
        where: {
            id: { in: data.memberIds }
        },
        select: { id: true, name: true, career: true }
    });

    for (const student of studentsToAdd) {
        if (student.career !== group.owner.career) {
            throw new AppError(400, `El estudiante ${student.name || student.id} no pertenece a la carrera ${group.owner.career}`);
        }
    }

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

export async function removeMemberFromGroup(groupId: string, ownerId: string, memberId: string, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true }
        });
        if (existing) dbOwnerId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });

    if (!group) throw new AppError(404, 'Study group not found');
    if (group.ownerId !== dbOwnerId) throw new AppError(403, 'Only the owner can remove members');
    if (dbOwnerId === memberId) throw new AppError(400, 'Owner cannot be removed from their own group');

    return prisma.studyGroup.update({
        where: { id: groupId },
        data: {
            members: {
                disconnect: { id: memberId }
            }
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true, career: true, currentSemester: true } },
        }
    });
}

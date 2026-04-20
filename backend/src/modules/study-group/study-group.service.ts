import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type { CreateStudyGroupInput, UpdateStudyGroupInput, AddMembersInput, CreateResourceInput } from './study-group.schemas.js';

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

export async function getDiscoverableStudyGroups(studentId: string, payload?: any) {
    let dbStudentId = studentId;
    let studentCareer: string | null = null;

    if (payload && payload.email) {
        const student = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true, career: true },
        });
        if (student) {
            dbStudentId = student.id;
            studentCareer = student.career;
        }
    } else {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { career: true },
        });
        studentCareer = student?.career || null;
    }

    // Restriction: students can only see groups created by members of their same career
    if (!studentCareer) {
        return []; // Return empty if student has no career assigned?
    }

    return prisma.studyGroup.findMany({
        where: {
            owner: {
                career: studentCareer
            },
            members: {
                none: {
                    id: dbStudentId
                }
            }
        },
        include: {
            owner: { select: { id: true, name: true, career: true } },
            _count: { select: { members: true } }
        }
    });
}

export async function updateStudyGroup(ownerId: string, groupId: string, data: UpdateStudyGroupInput, payload?: any) {
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

export async function removeMemberFromGroup(ownerId: string, groupId: string, memberIdToRemove: string, payload?: any) {
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
        include: { members: { orderBy: { createdAt: 'asc' } } }
    });

    if (!group) throw new AppError(404, 'Study group not found');
    
    // Check if the person making the request is valid
    if (dbOwnerId !== memberIdToRemove && group.ownerId !== dbOwnerId) {
        throw new AppError(403, 'Only the owner can remove other members');
    }

    // Attempting to remove self or owner leaving
    if (memberIdToRemove === group.ownerId) {
        // If there are other members, give it to the oldest member
        const otherMembers = group.members.filter(m => m.id !== group.ownerId);
        
        if (otherMembers.length > 0) {
            const nextOwner = otherMembers[0];
            return prisma.studyGroup.update({
                where: { id: groupId },
                data: {
                    ownerId: nextOwner.id,
                    members: {
                        disconnect: { id: memberIdToRemove }
                    }
                },
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                    members: { select: { id: true, name: true, email: true } }
                }
            });
        } else {
            // Delete group if no members left
            await prisma.studyGroup.delete({ where: { id: groupId } });
            return { deleted: true };
        }
    }

    return prisma.studyGroup.update({
        where: { id: groupId },
        data: {
            members: {
                disconnect: { id: memberIdToRemove }
            }
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true } }
        }
    });
}

export async function addStudyGroupResource(groupId: string, uploaderId: string, data: CreateResourceInput, payload?: any) {
    let dbUploaderId = uploaderId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbUploaderId = existing.id;
    }

    const group = await prisma.studyGroup.findFirst({
        where: { id: groupId, members: { some: { id: dbUploaderId } } }
    });

    if (!group) throw new AppError(403, 'Debes ser miembro del grupo para añadir recursos');

    return prisma.studyGroupResource.create({
        data: {
            groupId,
            uploaderId: dbUploaderId,
            title: data.title,
            type: data.type,
            url: data.url || ''
        }
    });
}

export async function deleteStudyGroupResource(groupId: string, resourceId: string, userId: string, payload?: any) {
    let dbUserId = userId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbUserId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new AppError(404, 'Grupo de estudio no encontrado');

    const resource = await prisma.studyGroupResource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new AppError(404, 'Recurso no encontrado');

    if (group.ownerId !== dbUserId && resource.uploaderId !== dbUserId) {
        throw new AppError(403, 'Solo el autor o el administrador pueden eliminar este recurso');
    }

    return prisma.studyGroupResource.delete({ where: { id: resourceId } });
}

export async function getStudyGroupResources(groupId: string, userId: string, payload?: any) {
    let dbUserId = userId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbUserId = existing.id;
    }

    const group = await prisma.studyGroup.findFirst({
        where: { id: groupId, members: { some: { id: dbUserId } } }
    });

    if (!group) throw new AppError(403, 'Debes ser miembro del grupo para ver los recursos');

    return prisma.studyGroupResource.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' }
    });
}

// ============== NEW: STUDY GROUP REQUESTS ==============

export async function requestToJoinGroup(studentId: string, groupId: string, payload?: any) {
    let dbStudentId = studentId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbStudentId = existing.id;
    }

    // Check if the group exists
    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId },
        include: { members: true }
    });
    
    if (!group) {
        throw new AppError(404, 'Grupo de estudio no encontrado');
    }

    // Check if already a member
    if (group.members.some(member => member.id === dbStudentId)) {
        throw new AppError(400, 'Ya eres miembro de este grupo');
    }

    // Check if a request already exists
    const existingRequest = await prisma.studyGroupRequest.findUnique({
        where: {
            groupId_userId: {
                groupId: groupId,
                userId: dbStudentId
            }
        }
    });

    if (existingRequest) {
        if (existingRequest.status === 'PENDING') {
            throw new AppError(400, 'Ya has enviado una solicitud a este grupo');
        }
        // If it was rejected or somehow else, we can decide to update it to pending again, 
        // but let's just create/upsert it.
    }

    // Create the request
    return prisma.studyGroupRequest.upsert({
        where: {
            groupId_userId: {
                groupId: groupId,
                userId: dbStudentId
            }
        },
        update: { status: 'PENDING' },
        create: {
            groupId: groupId,
            userId: dbStudentId,
            status: 'PENDING'
        }
    });
}

export async function getGroupRequests(ownerId: string, groupId: string, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbOwnerId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId }
    });

    if (!group) throw new AppError(404, 'Grupo de estudio no encontrado');
    if (group.ownerId !== dbOwnerId) throw new AppError(403, 'No tienes permiso para ver solicitudes de este grupo');

    return prisma.studyGroupRequest.findMany({
        where: { groupId: groupId, status: 'PENDING' },
        include: {
            user: { select: { id: true, name: true, email: true, career: true, currentSemester: true } }
        }
    });
}

export async function respondToGroupRequest(ownerId: string, groupId: string, requestId: string, status: 'ACCEPTED' | 'REJECTED', payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbOwnerId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId }
    });

    if (!group) throw new AppError(404, 'Grupo de estudio no encontrado');
    if (group.ownerId !== dbOwnerId) throw new AppError(403, 'No tienes permiso para responder a esta solicitud');

    const request = await prisma.studyGroupRequest.findUnique({
        where: { id: requestId }
    });

    if (!request || request.groupId !== groupId) throw new AppError(404, 'Solicitud no encontrada');

    // Update Request status
    const updatedRequest = await prisma.studyGroupRequest.update({
        where: { id: requestId },
        data: { status }
    });

    if (status === 'ACCEPTED') {
        // Add user to the group members
        await prisma.studyGroup.update({
            where: { id: groupId },
            data: {
                members: {
                    connect: { id: request.userId }
                }
            }
        });

        // Create a notification for the accepted user
        await prisma.notification.create({
            data: {
                userId: request.userId,
                type: 'REQUEST_ACCEPTED',
                message: `¡Tu solicitud para unirte al grupo '${group.name}' ha sido aceptada!`
            }
        });
    }

    return updatedRequest;
}

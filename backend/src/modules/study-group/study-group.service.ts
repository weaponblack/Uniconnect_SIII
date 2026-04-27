import { AppError } from '../../errors/app-error.js';
import { getSocketIO } from '../../lib/socket.js';
import { prisma } from '../../lib/prisma.js';
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

// ============== TRANSFER OWNERSHIP + LEAVE GROUP ==============

export async function requestTransferOwnership(requesterId: string, groupId: string, newOwnerId: string, payload?: any) {
    let dbRequesterId = requesterId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbRequesterId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId },
        include: { members: { select: { id: true } } }
    });

    if (!group) throw new AppError(404, 'Grupo de estudio no encontrado');
    if (group.ownerId !== dbRequesterId) throw new AppError(403, 'Solo el administrador puede transferir la administración');

    const isMember = group.members.some(m => m.id === newOwnerId);
    if (!isMember) throw new AppError(400, 'El nuevo administrador debe ser miembro del grupo');
    if (newOwnerId === dbRequesterId) throw new AppError(400, 'No puedes transferirte la administración a ti mismo');

    // Check if there is already a pending request
    const existingReq = await prisma.groupTransferRequest.findFirst({
        where: { groupId, status: 'PENDING' }
    });
    if (existingReq) {
        throw new AppError(400, 'Ya existe una solicitud de transferencia pendiente.');
    }

    const request = await prisma.groupTransferRequest.create({
        data: {
            groupId,
            ownerId: dbRequesterId,
            newOwnerId,
            status: 'PENDING'
        },
        include: { group: true }
    });

    try {
        const notification = await prisma.notification.create({
            data: {
                userId: newOwnerId,
                type: 'ADMIN_TRANSFER_REQUEST',
                message: `El dueño de '${request.group.name}' quiere transferirte la administración del grupo.`
            }
        });

        const io = getSocketIO();
        io.to(newOwnerId).emit('notification', notification);
        io.to(newOwnerId).emit('transferRequest', request);
    } catch(e) {
        console.error('Socket error during transfer request', e);
    }

    return request;
}

export async function respondToTransferRequest(userId: string, requestId: string, status: 'ACCEPTED' | 'REJECTED', payload?: any) {
    let dbUserId = userId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbUserId = existing.id;
    }

    const request = await prisma.groupTransferRequest.findUnique({
        where: { id: requestId },
        include: { group: true }
    });

    if (!request || request.newOwnerId !== dbUserId) throw new AppError(404, 'Solicitud no encontrada');
    if (request.status !== 'PENDING') throw new AppError(400, 'La solicitud ya fue procesada');

    const updatedRequest = await prisma.groupTransferRequest.update({
        where: { id: requestId },
        data: { status }
    });

    if (status === 'ACCEPTED') {
        // Transfer ownership
        await prisma.studyGroup.update({
            where: { id: request.groupId },
            data: { ownerId: dbUserId }
        });
        
        // Remove old owner
        await prisma.studyGroup.update({
            where: { id: request.groupId },
            data: { members: { disconnect: { id: request.ownerId } } }
        });

        try {
            const notification = await prisma.notification.create({
                data: {
                    userId: request.ownerId,
                    type: 'ADMIN_TRANSFER_ACCEPTED',
                    message: `${payload?.name || 'Un usuario'} aceptó administrar '${request.group.name}'. Has abandonado el grupo.`
                }
            });
            const io = getSocketIO();
            io.to(request.ownerId).emit('notification', notification);
            io.to(request.ownerId).emit('transferAccepted', updatedRequest);
        } catch(e) { console.error(e) }
    } else {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId: request.ownerId,
                    type: 'ADMIN_TRANSFER_REJECTED',
                    message: `Se rechazó tu solicitud para administrar '${request.group.name}'.`
                }
            });
            const io = getSocketIO();
            io.to(request.ownerId).emit('notification', notification);
            io.to(request.ownerId).emit('transferRejected', updatedRequest);
        } catch (e) { console.error(e) }
    }

    return updatedRequest;
}

export async function getPendingTransferForGroup(ownerId: string, groupId: string, payload?: any) {
    let dbOwnerId = ownerId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbOwnerId = existing.id;
    }

    return prisma.groupTransferRequest.findFirst({
        where: { groupId, ownerId: dbOwnerId, status: 'PENDING' },
        include: { newOwner: { select: { name: true, email: true } } }
    });
}

export async function leaveStudyGroup(userId: string, groupId: string, payload?: any) {
    let dbUserId = userId;
    if (payload && payload.email) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
        if (existing) dbUserId = existing.id;
    }

    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId },
        include: { members: { select: { id: true } } }
    });

    if (!group) throw new AppError(404, 'Grupo de estudio no encontrado');

    const isMember = group.members.some(m => m.id === dbUserId);
    if (!isMember) throw new AppError(400, 'No eres miembro de este grupo');

    if (group.ownerId === dbUserId) {
        throw new AppError(400, 'Debes transferir la administración antes de abandonar el grupo');
    }

    const remainingCount = group.members.length - 1;
    if (remainingCount === 0) {
        await prisma.studyGroup.delete({ where: { id: groupId } });
        return { deleted: true };
    }

    await prisma.studyGroup.update({
        where: { id: groupId },
        data: { members: { disconnect: { id: dbUserId } } }
    });

    return { left: true };
}

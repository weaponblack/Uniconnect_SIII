import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';

// Reusable function to verify user is a true member of the group
async function checkMembership(groupId: string, userId: string, payload?: any) {
    const group = await prisma.studyGroup.findUnique({
        where: { id: groupId },
        include: { members: { select: { id: true, email: true } }, owner: { select: { id: true, email: true } } }
    });

    if (!group) throw new AppError(404, 'Grupo no encontrado');

    let authUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!authUser && payload?.email) {
        authUser = await prisma.user.findUnique({ where: { email: payload.email } });
    }
    if (!authUser) throw new AppError(404, 'Usuario no encontrado en base de datos');
    // Ensure we process with actual CUID
    userId = authUser.id;

    const userEmail = authUser.email.toLowerCase().trim();
    
    // Admins first via ID or Email mapping
    let isOwner = false;
    if (group.ownerId === userId) isOwner = true;
    if (group.owner?.email.toLowerCase().trim() === userEmail) isOwner = true;

    // Check normal members
    const isNormalMember = group.members.some(m => m.id === userId || m.email.toLowerCase().trim() === userEmail);
    
    if (!isOwner && !isNormalMember) {
        throw new AppError(403, 'No tienes permiso para acceder al muro del grupo');
    }
    
    return { group, isOwner, actualUserId: userId };
}

export async function createPost(groupId: string, authorId: string, data: any, files: Express.Multer.File[] = [], payload?: any) {
    const { group, isOwner, actualUserId } = await checkMembership(groupId, authorId, payload);
    authorId = actualUserId;
    
    // Only owners can pin
    const isPinned = isOwner && data.isPinned === 'true';

    // Build resource creations if files were uploaded
    const resourceCreations = files.map(file => ({
        title: file.originalname,
        url: `/uploads/${file.filename}`,  // local URL pointing to the static folder
        type: file.mimetype // e.g. application/pdf, image/jpeg
    }));

    return prisma.post.create({
        data: {
            content: data.content,
            type: data.type,
            isPinned,
            authorId,
            groupId,
            resources: {
                create: resourceCreations
            }
        },
        include: { 
            author: { select: { id: true, name: true, email: true, avatarUrl: true } }, 
            resources: true,
            comments: true 
        }
    });
}

export async function getGroupPosts(groupId: string, userId: string, payload?: any) {
    await checkMembership(groupId, userId, payload);
    
    return prisma.post.findMany({
        where: { groupId },
        orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
        ],
        include: {
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
            resources: true,
            comments: {
                include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}

export async function togglePinPost(groupId: string, postId: string, userId: string, payload?: any) {
    const { isOwner } = await checkMembership(groupId, userId, payload);
    if (!isOwner) throw new AppError(403, 'Solo el administrador del grupo puede fijar posts');
    
    const post = await prisma.post.findUnique({ where: { id: postId, groupId } });
    if (!post) throw new AppError(404, 'Post no encontrado en el grupo');

    return prisma.post.update({
        where: { id: postId },
        data: { isPinned: !post.isPinned },
        include: { author: true, resources: true, comments: true }
    });
}

export async function deletePost(groupId: string, postId: string, userId: string, payload?: any) {
    const { isOwner, actualUserId } = await checkMembership(groupId, userId, payload);
    userId = actualUserId;
    const post = await prisma.post.findUnique({ where: { id: postId, groupId } });
    
    if (!post) throw new AppError(404, 'Post no encontrado');

    const authUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!authUser) throw new AppError(404, 'User not found in DB');
    const userEmail = authUser.email.toLowerCase().trim();
    const actualAuthor = await prisma.user.findUnique({ where: { id: post.authorId }});

    // Valid if deleting user is ID author, Email Author, or Group Owner
    const isAuthor = (post.authorId === userId) || (actualAuthor?.email.toLowerCase().trim() === userEmail);

    if (!isAuthor && !isOwner) {
        throw new AppError(403, 'No tienes permiso para eliminar esta publicación');
    }

    return prisma.post.delete({ where: { id: postId } });
}

export async function addComment(groupId: string, postId: string, authorId: string, content: string, payload?: any) {
    const { actualUserId } = await checkMembership(groupId, authorId, payload);
    authorId = actualUserId;
    
    const post = await prisma.post.findUnique({ where: { id: postId, groupId } });
    if (!post) throw new AppError(404, 'El post no ha sido encontrado en este grupo');

    return prisma.comment.create({
        data: {
            content,
            postId,
            authorId
        },
        include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } }
    });
}

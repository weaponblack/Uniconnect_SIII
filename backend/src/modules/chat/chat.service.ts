import { prisma } from '../../lib/prisma.js';
import { getIO, emitToUser } from '../../lib/socket.js';
import { AppError } from '../../errors/app-error.js';

export class ChatService {
  async getGroupMessages(groupId: string, userId: string) {
    // Validate membership
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new AppError(404, 'Grupo no encontrado');

    const isMember = group.members.some((m) => m.id === userId) || group.ownerId === userId;
    if (!isMember) throw new AppError(403, 'No tienes acceso a este grupo');

    return prisma.message.findMany({
      where: { groupId, isPrivate: false },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  async sendGroupMessage(data: {
    groupId: string;
    senderId: string;
    content: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  }) {
    const { groupId, senderId, content, fileUrl, fileName, fileType } = data;

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new AppError(404, 'Grupo no encontrado');

    const isMember = group.members.some((m) => m.id === senderId) || group.ownerId === senderId;
    if (!isMember) throw new AppError(403, 'No perteneces a este grupo');

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        groupId,
        isPrivate: false,
        fileUrl,
        fileName,
        fileType,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Emit to group
    const io = getIO();
    io.to(`group-${groupId}`).emit('group-message', message);

    // Notifications logic
    for (const member of group.members) {
      if (member.id !== senderId) {
        const memberFirstName = member.name?.split(' ')[0];
        const isMentioned = !!memberFirstName && content.includes(`@${memberFirstName}`);

        let notificationType = 'GROUP_MESSAGE';
        let notificationMsg = `Nuevo mensaje en el grupo ${group.name}`;

        if (isMentioned) {
          notificationType = 'MENTION';
          notificationMsg = `Te han mencionado en el grupo ${group.name}`;
        }

        const notif = await prisma.notification.create({
          data: {
            userId: member.id,
            type: notificationType,
            message: notificationMsg,
          }
        });

        emitToUser(member.id, 'new-notification', {
          ...notif,
          groupId: group.id,
          groupName: group.name
        });
      }
    }

    return message;
  }

  async getPrivateMessages(userId: string, otherUserId: string) {
    return prisma.message.findMany({
      where: {
        isPrivate: true,
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async sendPrivateMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  }) {
    const { senderId, receiverId, content, fileUrl, fileName, fileType } = data;

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        isPrivate: true,
        fileUrl,
        fileName,
        fileType,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const io = getIO();
    // Emit to both users
    io.to(`user-${receiverId}`).emit('private-message', message);
    io.to(`user-${senderId}`).emit('private-message', message);

    // Notification logic
    const notif = await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'PRIVATE_MESSAGE',
        message: `Nuevo mensaje privado de ${message.sender.name}`,
      }
    });
    emitToUser(receiverId, 'new-notification', {
      ...notif,
      senderId: senderId,
      senderName: message.sender.name || 'Usuario'
    });

    return message;
  }
}

export const chatService = new ChatService();

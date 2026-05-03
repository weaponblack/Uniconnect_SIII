import { prisma } from '../../../lib/prisma.js';
import { emitToUser } from '../../../lib/socket.js';
import { Observer, StudyGroupEvent } from './study-group.subject.js';

export class NotificationObserver implements Observer {
  async update(event: StudyGroupEvent, data: any): Promise<void> {
    switch (event) {
      case 'JOIN_REQUEST_ACCEPTED':
        await this.handleJoinRequestAccepted(data);
        break;
      case 'JOIN_REQUEST_REJECTED':
        await this.handleJoinRequestRejected(data);
        break;
      case 'OWNERSHIP_TRANSFERRED':
        await this.handleOwnershipTransferred(data);
        break;
      case 'GROUP_CREATED':
        await this.handleGroupCreated(data);
        break;
      case 'RESOURCE_ADDED':
        await this.handleResourceAdded(data);
        break;
    }
  }

  private async handleGroupCreated(data: any) {
    const { ownerId, groupName } = data;
    console.log(`[Notification] Group created: ${groupName} by ${ownerId}`);
  }

  private async handleResourceAdded(data: any) {
    const { groupId, uploaderId, title } = data;
    console.log(`[Notification] New resource '${title}' added to group ${groupId} by ${uploaderId}`);
  }

  private async handleJoinRequestAccepted(data: any) {
    const { userId, groupId, groupName } = data;
    
    await prisma.notification.create({
      data: {
        userId,
        type: 'REQUEST_ACCEPTED',
        message: `¡Tu solicitud para unirte al grupo '${groupName}' ha sido aceptada!`
      }
    });

    emitToUser(userId, 'study-group-request-accepted', {
      groupId,
      groupName
    });
  }

  private async handleJoinRequestRejected(data: any) {
    const { userId, groupId, groupName, ownerName } = data;

    await prisma.notification.create({
      data: {
        userId,
        type: 'REQUEST_REJECTED',
        message: `Tu solicitud para unirte al grupo '${groupName}' ha sido rechazada`
      }
    });

    emitToUser(userId, 'study-group-request-rejected', {
      groupId,
      groupName,
      requesterName: ownerName
    });
  }

  private async handleOwnershipTransferred(data: any) {
    const { fromId, groupId, groupName } = data;

    emitToUser(fromId, 'ownership-transfer-accepted', {
      groupId,
      groupName
    });
  }
}

import type { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service.js';

export class ChatController {
  async getGroupHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: 'No autenticado' });

      const messages = await chatService.getGroupMessages(groupId, userId);
      return res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  async sendGroupMsg(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.sub;
      const { content } = req.body;
      if (!userId) return res.status(401).json({ message: 'No autenticado' });

      let fileUrl, fileName, fileType;
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
        fileName = req.file.originalname;
        fileType = req.file.mimetype;
      }

      const message = await chatService.sendGroupMessage({
        groupId,
        senderId: userId,
        content: content || '',
        fileUrl,
        fileName,
        fileType,
      });
      return res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  async getPrivateHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { otherUserId } = req.params;
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: 'No autenticado' });

      const messages = await chatService.getPrivateMessages(userId, otherUserId);
      return res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  async sendPrivateMsg(req: Request, res: Response, next: NextFunction) {
    try {
      const { otherUserId } = req.params;
      const userId = req.user?.sub;
      const { content } = req.body;
      if (!userId) return res.status(401).json({ message: 'No autenticado' });

      let fileUrl, fileName, fileType;
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
        fileName = req.file.originalname;
        fileType = req.file.mimetype;
      }

      const message = await chatService.sendPrivateMessage({
        senderId: userId,
        receiverId: otherUserId,
        content: content || '',
        fileUrl,
        fileName,
        fileType,
      });
      return res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();

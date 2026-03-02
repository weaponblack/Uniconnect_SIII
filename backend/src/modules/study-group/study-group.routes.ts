import { Router } from 'express';
import {
    createStudyGroupHandler,
    getStudentStudyGroupsHandler,
    updateStudyGroupHandler,
    addMembersToGroupHandler,
    deleteStudyGroupHandler,
    removeMemberFromGroupHandler
} from './study-group.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const studyGroupRouter = Router();

// Require valid JWT authentication for all study group routes
studyGroupRouter.use(requireAuth);

studyGroupRouter.post('/', createStudyGroupHandler);
studyGroupRouter.get('/student/:studentId', getStudentStudyGroupsHandler);
studyGroupRouter.put('/:groupId', updateStudyGroupHandler);
studyGroupRouter.post('/:groupId/members', addMembersToGroupHandler);
studyGroupRouter.delete('/:groupId/members/:memberId', removeMemberFromGroupHandler);
studyGroupRouter.delete('/:groupId', deleteStudyGroupHandler);

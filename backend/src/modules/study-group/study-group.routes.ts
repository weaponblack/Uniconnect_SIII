import { Router } from 'express';
import {
    createStudyGroupHandler,
    getStudentStudyGroupsHandler,
    updateStudyGroupHandler,
    addMembersToGroupHandler,
    deleteStudyGroupHandler,
    removeMemberFromGroupHandler,
    requestJoinHandler,
    getGroupRequestsHandler,
    respondToRequestHandler,
    getDiscoverableStudyGroupsHandler,
    requestTransferOwnershipHandler,
    respondToTransferRequestHandler,
    getPendingTransferHandler,
    leaveGroupHandler
} from './study-group.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { postRouter } from '../post/post.routes.js';

export const studyGroupRouter = Router();

// Require valid JWT authentication for all study group routes
studyGroupRouter.use(requireAuth);

studyGroupRouter.use('/:groupId/posts', postRouter);

studyGroupRouter.post('/', createStudyGroupHandler);
studyGroupRouter.get('/student/:studentId', getStudentStudyGroupsHandler);
studyGroupRouter.get('/discover', getDiscoverableStudyGroupsHandler);
studyGroupRouter.put('/:groupId', updateStudyGroupHandler);
studyGroupRouter.post('/:groupId/members', addMembersToGroupHandler);
studyGroupRouter.delete('/:groupId/members/:memberId', removeMemberFromGroupHandler);
studyGroupRouter.delete('/:groupId', deleteStudyGroupHandler);

// Request to join group
studyGroupRouter.post('/:groupId/requests', requestJoinHandler);
studyGroupRouter.get('/:groupId/requests', getGroupRequestsHandler);
studyGroupRouter.put('/:groupId/requests/:requestId', respondToRequestHandler);

// Transfer ownership & leave group
studyGroupRouter.put('/:groupId/transfer-ownership', requestTransferOwnershipHandler);
studyGroupRouter.get('/:groupId/transfer-pending', getPendingTransferHandler);
studyGroupRouter.put('/transfer/:requestId/respond', respondToTransferRequestHandler);
studyGroupRouter.delete('/:groupId/leave', leaveGroupHandler);

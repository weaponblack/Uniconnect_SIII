import { Router } from 'express';
import {
    createStudyGroupHandler,
    getStudentStudyGroupsHandler,
    updateStudyGroupHandler,
    addMembersToGroupHandler,
    deleteStudyGroupHandler,
    removeMemberFromGroupHandler,
    addStudyGroupResourceHandler,
    deleteStudyGroupResourceHandler,
    getStudyGroupResourcesHandler,
    requestJoinHandler,
    getGroupRequestsHandler,
    respondToRequestHandler,
    getDiscoverableStudyGroupsHandler,
    transferOwnershipHandler,
    leaveGroupHandler,
    createTransferRequestHandler,
    getPendingTransfersHandler,
    respondToTransferRequestHandler
} from './study-group.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { uploadPDF } from '../../middlewares/upload.js';
import { postRouter } from '../post/post.routes.js';

export const studyGroupRouter = Router();

// Require valid JWT authentication for all study group routes
studyGroupRouter.use(requireAuth);

studyGroupRouter.use('/:groupId/posts', postRouter);

// Transfer ownership & leave group
studyGroupRouter.get('/transfers/pending', getPendingTransfersHandler);

// Group management
studyGroupRouter.post('/', createStudyGroupHandler);
studyGroupRouter.get('/student/:studentId', getStudentStudyGroupsHandler);
studyGroupRouter.get('/discover', getDiscoverableStudyGroupsHandler);
studyGroupRouter.put('/:groupId', updateStudyGroupHandler);
studyGroupRouter.post('/:groupId/members', addMembersToGroupHandler);
studyGroupRouter.delete('/:groupId/members/:memberId', removeMemberFromGroupHandler);
studyGroupRouter.delete('/:groupId', deleteStudyGroupHandler);

// Resources
studyGroupRouter.get('/:groupId/resources', getStudyGroupResourcesHandler);
studyGroupRouter.post('/:groupId/resources', uploadPDF.single('file'), addStudyGroupResourceHandler);
studyGroupRouter.delete('/:groupId/resources/:resourceId', deleteStudyGroupResourceHandler);

// Request to join group
studyGroupRouter.post('/:groupId/requests', requestJoinHandler);
studyGroupRouter.get('/:groupId/requests', getGroupRequestsHandler);
studyGroupRouter.put('/:groupId/requests/:requestId', respondToRequestHandler);

// Transfer ownership & leave group
studyGroupRouter.post('/:groupId/transfer-request', createTransferRequestHandler);
studyGroupRouter.post('/:groupId/transfer-response/:requestId', respondToTransferRequestHandler);
studyGroupRouter.put('/:groupId/transfer-ownership', transferOwnershipHandler);
studyGroupRouter.delete('/:groupId/leave', leaveGroupHandler);

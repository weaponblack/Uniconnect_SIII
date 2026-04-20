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
    getDiscoverableStudyGroupsHandler
} from './study-group.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { uploadPDF } from '../../middlewares/upload.js';
import { postRouter } from '../post/post.routes.js';

export const studyGroupRouter = Router();

// Test route
studyGroupRouter.post('/test-upload', uploadPDF.single('file'), (req, res) => {
    console.log("TEST UPLOAD - Body:", req.body);
    console.log("TEST UPLOAD - File:", (req as any).file);
    res.json({ body: req.body, file: (req as any).file });
});

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

// Resources
studyGroupRouter.get('/:groupId/resources', getStudyGroupResourcesHandler);
studyGroupRouter.post('/:groupId/resources', uploadPDF.single('file'), addStudyGroupResourceHandler);
studyGroupRouter.delete('/:groupId/resources/:resourceId', deleteStudyGroupResourceHandler);

// Request to join group
studyGroupRouter.post('/:groupId/requests', requestJoinHandler);
studyGroupRouter.get('/:groupId/requests', getGroupRequestsHandler);
studyGroupRouter.put('/:groupId/requests/:requestId', respondToRequestHandler);

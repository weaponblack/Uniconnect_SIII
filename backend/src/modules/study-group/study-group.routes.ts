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
    getStudyGroupResourcesHandler
} from './study-group.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { uploadPDF } from '../../middlewares/upload.js';

export const studyGroupRouter = Router();

// Test route
studyGroupRouter.post('/test-upload', uploadPDF.single('file'), (req, res) => {
    console.log("TEST UPLOAD - Body:", req.body);
    console.log("TEST UPLOAD - File:", (req as any).file);
    res.json({ body: req.body, file: (req as any).file });
});

// Require valid JWT authentication for all study group routes
studyGroupRouter.use(requireAuth);

studyGroupRouter.post('/', createStudyGroupHandler);
studyGroupRouter.get('/student/:studentId', getStudentStudyGroupsHandler);
studyGroupRouter.put('/:groupId', updateStudyGroupHandler);
studyGroupRouter.post('/:groupId/members', addMembersToGroupHandler);
studyGroupRouter.delete('/:groupId/members/:memberId', removeMemberFromGroupHandler);
studyGroupRouter.delete('/:groupId', deleteStudyGroupHandler);

// Resources
studyGroupRouter.get('/:groupId/resources', getStudyGroupResourcesHandler);
studyGroupRouter.post('/:groupId/resources', uploadPDF.single('file'), addStudyGroupResourceHandler);
studyGroupRouter.delete('/:groupId/resources/:resourceId', deleteStudyGroupResourceHandler);

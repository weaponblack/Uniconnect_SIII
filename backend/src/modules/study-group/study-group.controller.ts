import type { Request, Response, NextFunction } from 'express';
import { createStudyGroup, getStudentStudyGroups, updateStudyGroup, addMembersToGroup } from './study-group.service.js';
import { createStudyGroupSchema, updateStudyGroupSchema, addMembersSchema } from './study-group.schemas.js';

export async function createStudyGroupHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.sub;
        const data = createStudyGroupSchema.parse(req.body);
        const newGroup = await createStudyGroup(userId, data);
        res.status(201).json(newGroup);
    } catch (error) {
        next(error);
    }
}

export async function getStudentStudyGroupsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        // the endpoint is GET /groups/student/:studentId but usually the student views their own groups 
        // using the authenticated userId if the param isn't strictly required to be another.
        // I will use req.params.studentId
        const studentId = req.params.studentId;
        const groups = await getStudentStudyGroups(studentId);
        res.json(groups);
    } catch (error) {
        next(error);
    }
}

export async function updateStudyGroupHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.sub;
        const groupId = req.params.groupId;
        const data = updateStudyGroupSchema.parse(req.body);

        const updatedGroup = await updateStudyGroup(groupId, userId, data);
        res.json(updatedGroup);
    } catch (error) {
        next(error);
    }
}

export async function addMembersToGroupHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.sub;
        const groupId = req.params.groupId;
        const data = addMembersSchema.parse(req.body);

        const updatedGroup = await addMembersToGroup(groupId, userId, data);
        res.json(updatedGroup);
    } catch (error) {
        next(error);
    }
}

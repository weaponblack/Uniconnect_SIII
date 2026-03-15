import type { Request, Response } from 'express';
import { createStudyGroup, getStudentStudyGroups, updateStudyGroup, addMembersToGroup, deleteStudyGroup, removeMemberFromGroup } from './study-group.service.js';
import { createStudyGroupSchema, updateStudyGroupSchema, addMembersSchema } from './study-group.schemas.js';
import { catchAsync } from '../../lib/catch-async.js';

export const createStudyGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const payload = req.user!;
    const data = createStudyGroupSchema.parse(req.body);
    const newGroup = await createStudyGroup(payload.sub, data, payload);
    res.status(201).json(newGroup);
});

export const getStudentStudyGroupsHandler = catchAsync(async (req: Request, res: Response) => {
    const payload = req.user!;
    const groups = await getStudentStudyGroups(payload.sub, payload);
    res.json(groups);
});

export const updateStudyGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;
    const data = updateStudyGroupSchema.parse(req.body);

    const updatedGroup = await updateStudyGroup(groupId, userId, data, req.user);
    res.json(updatedGroup);
});

export const addMembersToGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;
    const data = addMembersSchema.parse(req.body);

    const updatedGroup = await addMembersToGroup(groupId, userId, data, req.user);
    res.json(updatedGroup);
});

export const deleteStudyGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;

    await deleteStudyGroup(groupId, userId, req.user);
    res.status(204).send();
});

export const removeMemberFromGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;

    const updatedGroup = await removeMemberFromGroup(groupId, userId, memberId, req.user);
    res.json(updatedGroup);
});

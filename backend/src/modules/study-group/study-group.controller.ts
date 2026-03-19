import type { Request, Response } from 'express';
import { createStudyGroup, getStudentStudyGroups, updateStudyGroup, addMembersToGroup, deleteStudyGroup, removeMemberFromGroup } from './study-group.service.js';
import { createStudyGroupSchema, updateStudyGroupSchema, addMembersSchema } from './study-group.schemas.js';
import { catchAsync } from '../../lib/catch-async.js';
import { AppError } from '../../errors/app-error.js';

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

export const addStudyGroupResourceHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;

    // Data can come from body (for links) or parsed body with uploaded file url
    let data;
    const reqAny = req as any;

    if (req.body.type === 'PDF' && !reqAny.file) {
        throw new AppError(400, 'El archivo PDF no se recibió correctamente en el servidor');
    }

    if (reqAny.file) {
        data = {
            title: req.body.title || 'Documento PDF',
            type: 'PDF' as const,
            url: `/uploads/groups/${reqAny.file.filename}`
        };
    } else {
        data = {
            title: req.body.title,
            type: req.body.type,
            url: req.body.url
        };
    }

    const newResource = await getService().addStudyGroupResource(groupId, userId, data, req.user);
    res.status(201).json(newResource);
});

export const deleteStudyGroupResourceHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;
    const resourceId = req.params.resourceId;

    await getService().deleteStudyGroupResource(groupId, resourceId, userId, req.user);
    res.status(204).send();
});

export const getStudyGroupResourcesHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;

    const resources = await getService().getStudyGroupResources(groupId, userId, req.user);
    res.json(resources);
});

// Using a getter to avoid circular dependencies if any, or just import them directly:
import * as service from './study-group.service.js';
function getService() {
    return service;
}

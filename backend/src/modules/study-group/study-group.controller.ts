import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../errors/app-error.js';
import {
    createStudyGroup, getStudentStudyGroups, updateStudyGroup,
    addMembersToGroup, deleteStudyGroup, removeMemberFromGroup,
    requestToJoinGroup, getGroupRequests, respondToGroupRequest,
    getDiscoverableStudyGroups, transferGroupOwnership, leaveStudyGroup,
    createOwnershipTransferRequest, getPendingOwnershipTransfers, respondToOwnershipTransferRequest
} from './study-group.service.js';
import { createStudyGroupSchema, updateStudyGroupSchema, addMembersSchema, respondToRequestSchema } from './study-group.schemas.js';
import { catchAsync } from '../../lib/catch-async.js';

export const createStudyGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const payload = req.user!;
    const data = createStudyGroupSchema.parse(req.body);
    const newGroup = await createStudyGroup(payload.sub, data, payload);
    res.status(201).json(newGroup);
});

export async function getStudentStudyGroupsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const { studentId } = req.params;
        const groups = await getStudentStudyGroups(studentId, req.user);
        res.json(groups);
    } catch (error) {
        next(error);
    }
}

export async function getDiscoverableStudyGroupsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = req.user;
        if (!payload || !payload.sub) {
            throw new AppError(401, 'No autorizado');
        }
        const groups = await getDiscoverableStudyGroups(payload.sub, payload);
        res.json(groups);
    } catch (error) {
        next(error);
    }
}

export const updateStudyGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;
    const data = updateStudyGroupSchema.parse(req.body);

    const updatedGroup = await updateStudyGroup(userId, groupId, data, req.user);
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
    const { newOwnerId } = req.body;

    const updatedGroup = await removeMemberFromGroup(userId, groupId, memberId, req.user, newOwnerId);
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

export async function requestJoinHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = req.user;
        if (!payload || !payload.sub) {
            throw new AppError(401, 'No autorizado');
        }

        const { groupId } = req.params;
        const request = await requestToJoinGroup(payload.sub, groupId, payload);
        res.status(201).json(request);
    } catch (error) {
        next(error);
    }
}

export async function getGroupRequestsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = req.user;
        if (!payload || !payload.sub) {
            throw new AppError(401, 'No autorizado');
        }

        const { groupId } = req.params;
        const requests = await getGroupRequests(payload.sub, groupId, payload);
        res.json(requests);
    } catch (error) {
        next(error);
    }
}

export async function respondToRequestHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = req.user;
        if (!payload || !payload.sub) {
            throw new AppError(401, 'No autorizado');
        }

        const { groupId, requestId } = req.params;
        const result = respondToRequestSchema.safeParse(req.body);
        if (!result.success) {
            throw new AppError(400, 'Datos invalidos');
        }

        const response = await respondToGroupRequest(payload.sub, groupId, requestId, result.data.status, payload);
        res.json(response);
    } catch (error) {
        next(error);
    }
}

export const transferOwnershipHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { groupId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) throw new AppError(400, 'Debe proporcionar el ID del nuevo administrador');

    const result = await transferGroupOwnership(userId, groupId, newOwnerId, req.user);
    res.json(result);
});

export const leaveGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { groupId } = req.params;

    const result = await leaveStudyGroup(userId, groupId, req.user);
    res.json(result);
});

export const createTransferRequestHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { groupId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) throw new AppError(400, 'Debe proporcionar el ID del nuevo administrador');

    const result = await createOwnershipTransferRequest(userId, groupId, newOwnerId, req.user);
    res.status(201).json(result);
});

export const getPendingTransfersHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const result = await getPendingOwnershipTransfers(userId, req.user);
    res.json(result);
});

export const respondToTransferRequestHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { groupId, requestId } = req.params;
    const { accept } = req.body;

    if (accept === undefined) throw new AppError(400, 'Debe indicar si acepta o rechaza');

    const result = await respondToOwnershipTransferRequest(userId, groupId, requestId, accept, req.user);
    res.json(result);
});

// Using a getter to avoid circular dependencies if any, or just import them directly:
import * as service from './study-group.service.js';
function getService() {
    return service;
}

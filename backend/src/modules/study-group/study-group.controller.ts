import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../errors/app-error.js';
import {
    createStudyGroup, getStudentStudyGroups, updateStudyGroup,
    addMembersToGroup, deleteStudyGroup, removeMemberFromGroup,
    requestToJoinGroup, getGroupRequests, respondToGroupRequest,
    getDiscoverableStudyGroups, requestTransferOwnership, leaveStudyGroup,
    respondToTransferRequest, getPendingTransferForGroup
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

    const updatedGroup = await removeMemberFromGroup(userId, groupId, memberId, req.user);
    res.json(updatedGroup);
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

export const requestTransferOwnershipHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;
    const { newOwnerId } = req.body;

    if (!newOwnerId) throw new AppError(400, 'newOwnerId es requerido');

    const updatedGroup = await requestTransferOwnership(userId, groupId, newOwnerId, req.user);
    res.json(updatedGroup);
});

export const respondToTransferRequestHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { requestId } = req.params;
    const { status } = req.body;

    if (status !== 'ACCEPTED' && status !== 'REJECTED') {
        throw new AppError(400, 'El status debe ser ACCEPTED o REJECTED');
    }

    const result = await respondToTransferRequest(userId, requestId, status, req.user);
    res.json(result);
});

export const getPendingTransferHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;

    const result = await getPendingTransferForGroup(userId, groupId, req.user);
    // If no request, return 404 or null
    res.json(result || null);
});

export const leaveGroupHandler = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const groupId = req.params.groupId;

    const result = await leaveStudyGroup(userId, groupId, req.user);
    res.json(result);
});

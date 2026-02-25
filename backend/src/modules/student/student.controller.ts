import type { Request, Response, NextFunction } from 'express';
import { getStudentProfile, updateStudentProfile, getAllSubjects } from './student.service.js';
import { updateProfileSchema } from './student.schemas.js';

export async function getProfileHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.sub;
        const profile = await getStudentProfile(userId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
}

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.sub;

        // Validate request body
        const data = updateProfileSchema.parse(req.body);

        const updatedProfile = await updateStudentProfile(userId, data);
        res.json(updatedProfile);
    } catch (error) {
        next(error);
    }
}

export async function getSubjectsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const subjects = await getAllSubjects();
        res.json(subjects);
    } catch (error) {
        next(error);
    }
}

import type { Request, Response, NextFunction } from 'express';
import { getStudentProfile, updateStudentProfile, getAllSubjects, searchStudentsByName } from './student.service.js';
import { updateProfileSchema } from './student.schemas.js';

export async function getProfileHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = req.user!;
        const profile = await getStudentProfile(payload.sub, payload);
        res.json(profile);
    } catch (error) {
        next(error);
    }
}

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = req.user!;

        // Validate request body
        const data = updateProfileSchema.parse(req.body);

        const updatedProfile = await updateStudentProfile(payload.sub, data, payload);
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

export async function searchStudentsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.sub;
        const query = req.query.name as string;
        const students = await searchStudentsByName(query, userId);
        res.json(students);
    } catch (error) {
        next(error);
    }
}

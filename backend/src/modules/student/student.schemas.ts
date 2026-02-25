import { z } from 'zod';

export const updateProfileSchema = z.object({
    career: z.string().optional(),
    currentSemester: z.number().int().min(1).max(20).optional(),
    subjects: z.array(z.string()).optional(), // Array of subject names or IDs
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

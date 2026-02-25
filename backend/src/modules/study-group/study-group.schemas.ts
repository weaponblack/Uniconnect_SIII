import { z } from 'zod';

export const createStudyGroupSchema = z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
});

export type CreateStudyGroupInput = z.infer<typeof createStudyGroupSchema>;

export const updateStudyGroupSchema = createStudyGroupSchema.partial();

export type UpdateStudyGroupInput = z.infer<typeof updateStudyGroupSchema>;

export const addMembersSchema = z.object({
    memberIds: z.array(z.string()),
});

export type AddMembersInput = z.infer<typeof addMembersSchema>;

import { z } from 'zod';

export const createPostSchema = z.object({
    content: z.string().min(1, 'El contenido no puede estar vacío'),
    type: z.enum(['GENERAL', 'PREGUNTA', 'MATERIAL', 'AVISO']).default('GENERAL')
});

export const addCommentSchema = z.object({
    content: z.string().min(1, 'El comentario no puede estar vacío')
});

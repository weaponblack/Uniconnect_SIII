import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../../lib/catch-async.js';
import { createPost, getGroupPosts, togglePinPost, deletePost, addComment } from './post.service.js';
import { createPostSchema, addCommentSchema } from './post.schemas.js';

export const createPostHandler = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const authorId = req.user!.sub;

    const data = createPostSchema.parse(req.body);
    // When using multer, files are available in req.files
    const files = req.files as Express.Multer.File[] || [];

    const newPost = await createPost(groupId, authorId, data, files, req.user);
    res.status(201).json(newPost);
});

export const getGroupPostsHandler = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const userId = req.user!.sub;
    const posts = await getGroupPosts(groupId, userId, req.user);
    res.json(posts);
});

export const togglePinPostHandler = catchAsync(async (req: Request, res: Response) => {
    const { groupId, postId } = req.params;
    const userId = req.user!.sub;
    const updatedPost = await togglePinPost(groupId, postId, userId, req.user);
    res.json(updatedPost);
});

export const deletePostHandler = catchAsync(async (req: Request, res: Response) => {
    const { groupId, postId } = req.params;
    const userId = req.user!.sub;

    await deletePost(groupId, postId, userId, req.user);
    res.status(204).send();
});

export const addCommentHandler = catchAsync(async (req: Request, res: Response) => {
    const { groupId, postId } = req.params;
    const authorId = req.user!.sub;
    const data = addCommentSchema.parse(req.body);

    const newComment = await addComment(groupId, postId, authorId, data.content, req.user);
    res.status(201).json(newComment);
});

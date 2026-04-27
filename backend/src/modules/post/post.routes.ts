import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { upload } from '../../lib/upload.js';
import {
    createPostHandler,
    getGroupPostsHandler,
    togglePinPostHandler,
    deletePostHandler,
    addCommentHandler,
    deleteResourceHandler
} from './post.controller.js';

// We need mergeParams: true to access :groupId from the parent router
export const postRouter = Router({ mergeParams: true });

postRouter.use(requireAuth);

postRouter.get('/', getGroupPostsHandler);

// Create a post can have up to 5 attachments under the 'files' field
postRouter.post('/', upload.array('files', 5), createPostHandler);

postRouter.put('/:postId/pin', togglePinPostHandler);
postRouter.delete('/:postId', deletePostHandler);
postRouter.post('/:postId/comments', addCommentHandler);
postRouter.delete('/:postId/resources/:resourceId', deleteResourceHandler);

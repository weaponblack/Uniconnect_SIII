import { Router } from 'express';
import { googleSignInHandler, googleWebSignInHandler, simpleSignInHandler, logoutHandler, refreshHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/google', googleSignInHandler);
authRouter.post('/google/web', googleWebSignInHandler);
authRouter.post('/simple', simpleSignInHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

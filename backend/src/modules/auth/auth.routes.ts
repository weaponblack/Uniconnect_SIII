import { Router } from 'express';
import { googleSignInHandler, logoutHandler, refreshHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/google', googleSignInHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

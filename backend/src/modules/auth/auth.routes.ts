import { Router } from 'express';
import { googleSignInHandler, simpleSignInHandler, logoutHandler, refreshHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/google', googleSignInHandler);
authRouter.post('/simple', simpleSignInHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

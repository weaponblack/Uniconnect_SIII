import { Router } from 'express';
import { googleSignInHandler, googleMobileSignInHandler, simpleSignInHandler, logoutHandler, refreshHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/google', googleSignInHandler);
authRouter.post('/google/mobile', googleMobileSignInHandler);
authRouter.post('/simple', simpleSignInHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

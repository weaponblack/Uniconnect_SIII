import jwksRsa from 'jwks-rsa';
import { env, allowedDomains, googleClientIds } from '../../config/env.js';
import { OAuth2Client } from 'google-auth-library';
import { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { Logger } from '../../lib/logger.js';

export class AuthManager {
    private static instance: AuthManager;
    private jwksClientInstance: jwksRsa.JwksClient;
    private googleOAuthClient: OAuth2Client;
    private logger = Logger.getInstance();

    private constructor() {
        this.logger.info('Initializing AuthManager Singleton');

        // Constructor starts clients once
        this.jwksClientInstance = jwksRsa({
            jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
        });

        this.googleOAuthClient = new OAuth2Client();
    }

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    // Wrapped getKey method usable by jwt.verify
    public getKey = (header: JwtHeader, callback: SigningKeyCallback) => {
        if (!header.kid) {
            return callback(new Error('No kid in token header'));
        }
        this.jwksClientInstance.getSigningKey(header.kid, (err, key) => {
            if (err || !key) {
                return callback(err || new Error('Unable to get signing key'));
            }
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
        });
    }

    public getGoogleClient(): OAuth2Client {
        return this.googleOAuthClient;
    }
}
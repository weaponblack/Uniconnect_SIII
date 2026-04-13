import { env } from '../config/env.js';

export class Logger {
    private static instance: Logger;

    // El constructor es privado para evitar usar "new Logger()"
    private constructor() {
        // Configuraciones iniciales del logger si las hubiera
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public info(message: string, context?: any) {
        if (context) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context);
        } else {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
        }
    }

    public error(message: string, error?: any) {
        if (error) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
        } else {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        }
    }
    
    public warn(message: string, context?: any) {
        if (context) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context);
        } else {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
        }
    }
}

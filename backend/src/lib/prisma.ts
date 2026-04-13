import { PrismaClient } from '@prisma/client';
import { Logger } from './logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __dbInstance__: Database | undefined;
}

export class Database {
    private static instance: Database;
    private prismaClient: PrismaClient;
    private logger = Logger.getInstance();

    private constructor() {
        this.prismaClient = new PrismaClient();
        this.logger.info('Instancia Singleton de PrismaClient (Base de Datos) creada.');
    }

    public static getInstance(): Database {
        // En desarrollo (Node.js hot-reloads) protegemos el pool de conexiones de sobrecargarse
        if (!Database.instance) {
            if (process.env.NODE_ENV !== 'production') {
                if (!global.__dbInstance__) {
                    global.__dbInstance__ = new Database();
                }
                Database.instance = global.__dbInstance__;
            } else {
                Database.instance = new Database();
            }
        }
        return Database.instance;
    }

    public getClient(): PrismaClient {
        return this.prismaClient;
    }

    public async checkConnection(): Promise<boolean> {
        try {
            await this.prismaClient.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            this.logger.error('No se pudo establecer conexion a la base de datos:', error);
            return false;
        }
    }
}

// Proxies exportados para no romper los módulos que ya importan `prisma`
const dbManager = Database.getInstance();
export const prisma = dbManager.getClient();

export async function checkDbConnection(): Promise<boolean> {
    return dbManager.checkConnection();
}

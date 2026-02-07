import "dotenv/config";

import type { PrismaClient as PrismaClientType } from "@prisma/client";
import * as PrismaClientPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const PrismaClient = ((PrismaClientPkg as any).PrismaClient ??
    (PrismaClientPkg as any).default?.PrismaClient) as any;

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClientType | undefined;

    // eslint-disable-next-line no-var
    var __prismaConnectPromise: Promise<void> | undefined;

    // eslint-disable-next-line no-var
    var __prismaConnected: boolean | undefined;
}

export function getPrisma() {
    if (globalThis.__prisma) {
        // Kick off a connection attempt (once) so we can log when the DB is reachable.
        if (
            !globalThis.__prismaConnectPromise &&
            !globalThis.__prismaConnected
        ) {
            globalThis.__prismaConnectPromise = globalThis.__prisma
                .$connect()
                .then(() => {
                    globalThis.__prismaConnected = true;
                    // Server-side log (terminal) to confirm DB connectivity.
                    console.log("[db] Connected");
                })
                .catch((error: unknown) => {
                    // Log once; app can still render in degraded mode in some loaders.
                    console.error("[db] Connection failed", error);
                });
        }

        return globalThis.__prisma;
    }

    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set");
    }

    let pool = new Pool({ connectionString: databaseUrl });
    let adapter = new PrismaPg(pool);
    let client = new PrismaClient({ adapter });

    // Kick off a connection attempt (once) so we can log when the DB is reachable.
    globalThis.__prismaConnectPromise = client
        .$connect()
        .then(() => {
            globalThis.__prismaConnected = true;
            // Server-side log (terminal) to confirm DB connectivity.
            console.log("[db] Connected");
        })
        .catch((error: unknown) => {
            console.error("[db] Connection failed", error);
        });

    // Cache in all environments. In dev this avoids duplicate clients during HMR;
    // in prod it ensures we don't create new pools/clients per request.
    globalThis.__prisma = client;

    return client;
}

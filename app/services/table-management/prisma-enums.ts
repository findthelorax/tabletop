import * as PrismaClientPkg from "@prisma/client";

export const TableStatus = ((PrismaClientPkg as any).TableStatus ??
    (PrismaClientPkg as any).default?.TableStatus) as any;

export const WaitlistStatus = ((PrismaClientPkg as any).WaitlistStatus ??
    (PrismaClientPkg as any).default?.WaitlistStatus) as any;

import * as PrismaClientPkg from "@prisma/client";

export const WaitlistStatus = ((PrismaClientPkg as any).WaitlistStatus ??
    (PrismaClientPkg as any).default?.WaitlistStatus) as any;

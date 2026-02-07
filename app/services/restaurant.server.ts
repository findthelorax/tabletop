import { hashPassword } from "../utils/password.server";

function isPrismaUnknownFieldError(error: unknown, fieldName: string): boolean {
    if (!(error instanceof Error)) return false;
    return (
        error.name === "PrismaClientValidationError" &&
        error.message.includes(`Unknown argument \`${fieldName}\``)
    );
}

export async function ensureBootstrapRestaurant(prisma: any): Promise<void> {
    let existingCount = 0;
    try {
        existingCount = await prisma.restaurant.count();
    } catch {
        existingCount = 0;
    }
    if (existingCount > 0) return;

    let loginUsername = (process.env.APP_USERNAME ?? "admin").trim() || "admin";
    let password = (process.env.APP_PASSWORD ?? "").trim();

    let passwordSalt: string | null = null;
    let passwordHash: string | null = null;
    if (password) {
        let hashed = hashPassword(password);
        passwordSalt = hashed.salt;
        passwordHash = hashed.hash;
    }

    try {
        await prisma.restaurant.create({
            data: {
                name: "Default Restaurant",
                storeNumber: 1,
                loginUsername,
                passwordSalt,
                passwordHash,
            },
            select: { id: true },
        });
    } catch (error) {
        // If the running server hasn't picked up a freshly generated Prisma Client yet,
        // it may not recognize new fields like storeNumber/loginUsername. Fall back to
        // a minimal create (DB defaults cover the new columns) so login can proceed.
        if (
            isPrismaUnknownFieldError(error, "storeNumber") ||
            isPrismaUnknownFieldError(error, "loginUsername")
        ) {
            await prisma.restaurant.create({
                data: { name: "Default Restaurant" },
                select: { id: true },
            });
            return;
        }
        throw error;
    }
}

export async function findRestaurantForLogin(prisma: any, username: string) {
    let trimmed = username.trim();
    if (!trimmed) return null;

    // If username is digits, treat it as store number.
    if (/^\d+$/.test(trimmed)) {
        let storeNumber = Number.parseInt(trimmed, 10);
        if (!Number.isFinite(storeNumber)) return null;

        try {
            return await prisma.restaurant.findUnique({
                where: { storeNumber },
            });
        } catch (error) {
            if (isPrismaUnknownFieldError(error, "storeNumber")) {
                let rows = (await prisma.$queryRaw`
                    SELECT * FROM "Restaurant" WHERE "storeNumber" = ${storeNumber} LIMIT 1
                `) as any[];
                return rows?.[0] ?? null;
            }
            throw error;
        }
    }

    try {
        return await prisma.restaurant.findUnique({
            where: { loginUsername: trimmed },
        });
    } catch (error) {
        if (isPrismaUnknownFieldError(error, "loginUsername")) {
            let rows = (await prisma.$queryRaw`
                SELECT * FROM "Restaurant" WHERE "loginUsername" = ${trimmed} LIMIT 1
            `) as any[];
            return rows?.[0] ?? null;
        }
        throw error;
    }
}

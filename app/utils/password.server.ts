import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type PasswordHash = {
    salt: string;
    hash: string;
};

export function hashPassword(password: string): PasswordHash {
    let salt = randomBytes(16).toString("base64");
    let hash = scryptSync(password, salt, 64).toString("base64");
    return { salt, hash };
}

export function verifyPassword(options: {
    password: string;
    salt: string;
    hash: string;
}): boolean {
    let { password, salt, hash } = options;

    try {
        let expected = Buffer.from(hash, "base64");
        let actual = Buffer.from(
            scryptSync(password, salt, 64).toString("base64"),
            "base64",
        );
        if (expected.length !== actual.length) return false;
        return timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
}

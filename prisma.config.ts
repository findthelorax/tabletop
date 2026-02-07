import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    // Using process.env keeps commands like `prisma generate` from failing
    // in environments where DATABASE_URL isn't set.
    datasource: {
        url: process.env.DATABASE_URL ?? "",
    },
});

import * as fs from "node:fs";

function safeAppendLine(filePath: string, line: string) {
    try {
        fs.appendFileSync(filePath, line + "\n", { encoding: "utf8" });
    } catch {
        // Ignore file logging failures.
    }
}

function formatUnknownError(error: unknown): {
    name?: string;
    message?: string;
    stack?: string;
    error?: string;
} {
    if (error instanceof Error) {
        return { name: error.name, message: error.message, stack: error.stack };
    }
    return { error: String(error) };
}

export function installServerErrorHandlers() {
    // Avoid double-install in dev/HMR.
    let g = globalThis as any;
    if (g.__appServerErrorHandlersInstalled) return;
    g.__appServerErrorHandlersInstalled = true;

    let logFile = process.env.ERROR_LOG_FILE?.trim();

    process.on("unhandledRejection", (reason) => {
        let payload = {
            type: "unhandledRejection",
            at: new Date().toISOString(),
            ...formatUnknownError(reason),
        };
        console.error("[process] unhandledRejection", payload);
        if (logFile) safeAppendLine(logFile, JSON.stringify(payload));
    });

    process.on("uncaughtException", (error) => {
        let payload = {
            type: "uncaughtException",
            at: new Date().toISOString(),
            ...formatUnknownError(error),
        };
        console.error("[process] uncaughtException", payload);
        if (logFile) safeAppendLine(logFile, JSON.stringify(payload));
    });
}

export type PrismaErrorInfo = {
    code?: string;
    modelName?: string;
};

export function getPrismaErrorInfo(error: unknown): PrismaErrorInfo {
    if (!error || typeof error !== "object") return {};

    let anyErr = error as any;

    let code = typeof anyErr.code === "string" ? anyErr.code : undefined;
    let modelName =
        typeof anyErr?.meta?.modelName === "string"
            ? anyErr.meta.modelName
            : undefined;

    return { code, modelName };
}

export function prismaP2021Message(modelName?: string) {
    let message =
        "Database schema is not migrated yet. Run `npm run db:migrate` and try again.";
    if (modelName) message += ` Missing model table: ${modelName}.`;
    return message;
}

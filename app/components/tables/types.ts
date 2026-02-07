import type { TableKind } from "./utils";

export type Area = {
    id: string;
    name: string;
    tables: Array<{
        id: string;
        areaId: string | null;
        tableNumber: number;
        capacity: number;
        kind: TableKind;
        seatedPartySize: number | null;
    }>;
};

export type ToastFn = (
    message: string,
    variant?: "success" | "error" | "info",
) => void;

import * as React from "react";

function lowerBoundByTableNumber(
    tables: Array<{ id: string; tableNumber: number }>,
    target: number,
) {
    let lo = 0;
    let hi = tables.length;
    while (lo < hi) {
        let mid = Math.floor((lo + hi) / 2);
        if (tables[mid].tableNumber < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

export function useTempTableNumberHotkeys(options: {
    enabled: boolean;
    tables: Array<{ id: string; tableNumber: number }>;
    onSelectTableId: (tableId: string) => void;
    focusRef?: React.RefObject<HTMLElement | null>;
    timeoutMs?: number;
    maxDigits?: number;
}) {
    let {
        enabled,
        tables,
        onSelectTableId,
        focusRef,
        timeoutMs = 1500,
        maxDigits = 3,
    } = options;

    let [typedDigits, setTypedDigits] = React.useState("");

    let digitsRef = React.useRef<{ value: string; lastAtMs: number }>({
        value: "",
        lastAtMs: 0,
    });

    let sortedTables = React.useMemo(
        () => [...tables].sort((a, b) => a.tableNumber - b.tableNumber),
        [tables],
    );

    let sortedTablesRef = React.useRef(sortedTables);
    React.useEffect(() => {
        sortedTablesRef.current = sortedTables;
    }, [sortedTables]);

    let onSelectTableIdRef = React.useRef(onSelectTableId);
    React.useEffect(() => {
        onSelectTableIdRef.current = onSelectTableId;
    }, [onSelectTableId]);

    let focusRefRef = React.useRef(focusRef);
    React.useEffect(() => {
        focusRefRef.current = focusRef;
    }, [focusRef]);

    let prevEnabledRef = React.useRef(false);

    React.useEffect(() => {
        if (!enabled) {
            prevEnabledRef.current = false;
            return;
        }

        if (!prevEnabledRef.current) {
            digitsRef.current = { value: "", lastAtMs: 0 };
            setTypedDigits("");
            prevEnabledRef.current = true;
        }

        function findBestMatchNumeric(digits: string) {
            if (!digits) return null;
            let n = Number.parseInt(digits, 10);
            if (!Number.isFinite(n)) return null;

            // UX: 1 digit => jump to that decade ("3" => 30/31/etc)
            //     2+ digits => jump to exact table number (or next available)
            let target = digits.length === 1 ? n * 10 : n;
            let current = sortedTablesRef.current;
            let idx = lowerBoundByTableNumber(current, target);
            if (idx >= current.length) return null;
            return current[idx];
        }

        function onKeyDown(e: KeyboardEvent) {
            if (e.defaultPrevented) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            // Avoid interfering with typing in text inputs.
            let target = e.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement
            ) {
                return;
            }
            if (target instanceof HTMLElement && target.isContentEditable) {
                return;
            }

            let now = Date.now();
            let buffer = digitsRef.current.value;

            if (e.key === "Backspace") {
                if (!buffer) return;
                e.preventDefault();
                buffer = buffer.slice(0, -1);
            } else if (/^\d$/.test(e.key)) {
                e.preventDefault();
                if (now - digitsRef.current.lastAtMs > timeoutMs) {
                    buffer = "";
                }
                if (buffer.length >= maxDigits) {
                    buffer = "";
                }
                buffer = buffer + e.key;
            } else {
                return;
            }

            let match = findBestMatchNumeric(buffer);
            if (match) {
                onSelectTableIdRef.current(match.id);
                // Keep focus on the select so the user can keep typing.
                focusRefRef.current?.current?.focus();
            }

            digitsRef.current = { value: buffer, lastAtMs: now };
            setTypedDigits(buffer);
        }

        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [enabled, maxDigits, timeoutMs]);

    return typedDigits;
}

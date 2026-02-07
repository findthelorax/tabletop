import * as React from "react";

export function useDashboardUndoHotkey({
    isBusy,
    onOpenUndo,
}: {
    isBusy: boolean;
    onOpenUndo: () => void;
}) {
    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.defaultPrevented) return;

            let key = e.key.toLowerCase();
            let isUndoCombo =
                (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
            if (!isUndoCombo || key !== "z") return;

            // Don't steal undo from text entry.
            let target = e.target;
            if (target instanceof HTMLElement) {
                let tag = target.tagName;
                if (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT" ||
                    target.isContentEditable
                ) {
                    return;
                }
            }

            // Match the Undo button behavior (disabled while busy).
            if (isBusy) return;

            e.preventDefault();
            e.stopPropagation();
            onOpenUndo();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isBusy, onOpenUndo]);
}

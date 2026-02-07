import * as React from "react";
import { createPortal } from "react-dom";

export function Modal({
    open,
    title,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    React.useEffect(() => {
        if (!open) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    return createPortal(
        <div
            className="modalOverlay"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modalPanel"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="modalHeader">
                    <div className="modalTitle">{title}</div>
                    <button
                        type="button"
                        className="tablesIconButton"
                        data-action="close"
                        onClick={onClose}
                        aria-label="Close dialog"
                        title="Close"
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}

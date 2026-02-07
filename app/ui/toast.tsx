import * as React from "react";

export type ToastVariant = "success" | "error" | "info";

type Toast = {
    id: string;
    message: string;
    variant: ToastVariant;
};

type ToastContextValue = {
    addToast: (message: string, variant?: ToastVariant) => void;
};

let ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    let [toasts, setToasts] = React.useState<Toast[]>([]);

    let addToast = React.useCallback(
        (message: string, variant: ToastVariant = "info") => {
            let id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            let toast: Toast = { id, message, variant };
            setToasts((prev) => [...prev, toast]);

            window.setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3500);
        },
        [],
    );

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div
                className="toastViewport"
                aria-live="polite"
                aria-relevant="additions"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="toast"
                        data-variant={t.variant}
                        role="status"
                    >
                        <div className="toastMessage">{t.message}</div>
                        <button
                            type="button"
                            className="toastDismiss"
                            data-action="close"
                            onClick={() =>
                                setToasts((prev) =>
                                    prev.filter((x) => x.id !== t.id),
                                )
                            }
                            aria-label="Dismiss notification"
                            title="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    let ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

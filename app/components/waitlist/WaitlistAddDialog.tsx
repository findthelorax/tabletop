import * as React from "react";

import { Modal } from "../../ui/modal";

import { digitsOnly } from "./waitlist-utils";
import {
    QUOTED_WAIT_OPTIONS,
    type SidebarTable,
} from "./waitlist-sidebar-types";

export function WaitlistAddDialog({
    open,
    isBusy,
    tables,
    onClose,
    onSubmit,
}: {
    open: boolean;
    isBusy: boolean;
    tables: SidebarTable[];
    onClose: () => void;
    onSubmit: (values: {
        partyName: string;
        partySize: number;
        phoneNumber: string;
        isCallAhead: boolean;
        preferredTableId: string | null;
        quotedWaitMinutes: number | null;
        notes: string;
    }) => void;
}) {
    let [partyName, setPartyName] = React.useState("");
    let [partySize, setPartySize] = React.useState("2");
    let [phoneNumber, setPhoneNumber] = React.useState("");
    let [isCallAhead, setIsCallAhead] = React.useState(false);
    let [preferredTableId, setPreferredTableId] = React.useState<string>("");
    let [quotedWaitMinutes, setQuotedWaitMinutes] = React.useState<string>("0");
    let [notes, setNotes] = React.useState("");

    let parsedPartySize = /^\d+$/.test(partySize)
        ? Number.parseInt(partySize, 10)
        : null;

    function clampPartySize(next: number): number {
        if (!Number.isFinite(next)) return 1;
        return Math.min(99, Math.max(1, Math.trunc(next)));
    }

    function incrementPartySize(delta: 1 | -1) {
        setPartySize((prev) => {
            let current = /^\d+$/.test(prev) ? Number.parseInt(prev, 10) : 0;
            let next = clampPartySize(current + delta);
            return String(next);
        });
    }

    React.useEffect(() => {
        if (!open) return;
        setPartyName("");
        setPartySize("2");
        setPhoneNumber("");
        setIsCallAhead(false);
        setPreferredTableId("");
        setQuotedWaitMinutes("0");
        setNotes("");
    }, [open]);

    if (!open) return null;

    return (
        <Modal
            open={open}
            title="Add to waitlist"
            onClose={() => {
                if (isBusy) return;
                onClose();
            }}
        >
            <form
                className="waitlistAddForm"
                onSubmit={(e) => {
                    e.preventDefault();
                    let size = clampPartySize(parsedPartySize ?? 1);
                    let quote = quotedWaitMinutes.trim()
                        ? Number.parseInt(quotedWaitMinutes, 10)
                        : null;
                    onSubmit({
                        partyName: partyName.trim(),
                        partySize: size,
                        phoneNumber: phoneNumber.trim(),
                        isCallAhead,
                        preferredTableId: preferredTableId || null,
                        quotedWaitMinutes:
                            quote != null && Number.isFinite(quote)
                                ? quote
                                : null,
                        notes: notes.trim(),
                    });
                }}
            >
                <div className="waitlistFormRow">
                    <div className="waitlistField">
                        <div className="waitlistLabel">Guest name</div>
                        <input
                            className="waitlistInput"
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="waitlistField">
                        <div className="waitlistLabel">Call-Ahead</div>
                        <label className="waitlistCheckboxRow">
                            <input
                                type="checkbox"
                                checked={isCallAhead}
                                onChange={(e) =>
                                    setIsCallAhead(e.target.checked)
                                }
                            />
                            Yes
                        </label>
                    </div>
                </div>

                <div className="waitlistFormRow">
                    <div className="waitlistField">
                        <div className="waitlistLabel">Party size</div>
                        <div className="waitlistNumberInput">
                            <input
                                className="waitlistInput waitlistNumberInputField"
                                inputMode="numeric"
                                value={partySize}
                                onChange={(e) =>
                                    setPartySize(digitsOnly(e.target.value))
                                }
                            />
                            <div className="waitlistNumberSpin">
                                <button
                                    type="button"
                                    className="waitlistNumberSpinButton"
                                    disabled={isBusy}
                                    aria-label="Increase party size"
                                    onClick={() => incrementPartySize(1)}
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        width="14"
                                        height="14"
                                        aria-hidden="true"
                                        focusable="false"
                                    >
                                        <path
                                            d="M5 12l5-5 5 5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="waitlistNumberSpinButton"
                                    disabled={
                                        isBusy || (parsedPartySize ?? 1) <= 1
                                    }
                                    aria-label="Decrease party size"
                                    onClick={() => incrementPartySize(-1)}
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        width="14"
                                        height="14"
                                        aria-hidden="true"
                                        focusable="false"
                                    >
                                        <path
                                            d="M5 8l5 5 5-5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="waitlistField">
                        <div className="waitlistLabel">Preferred table</div>
                        <select
                            className="waitlistInput"
                            value={preferredTableId}
                            onChange={(e) =>
                                setPreferredTableId(e.target.value)
                            }
                        >
                            <option value="">None</option>
                            {tables.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.label
                                        ? t.label
                                        : `Table ${t.tableNumber}`}{" "}
                                    ({t.capacity})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="waitlistFormRow">
                    <div className="waitlistField">
                        <div className="waitlistLabel">
                            Phone number (optional)
                        </div>
                        <input
                            className="waitlistInput"
                            inputMode="tel"
                            value={phoneNumber}
                            onChange={(e) =>
                                setPhoneNumber(
                                    digitsOnly(e.target.value).slice(0, 10),
                                )
                            }
                            placeholder="5555555555"
                        />
                    </div>

                    <div className="waitlistField">
                        <div className="waitlistLabel">
                            Quoted wait (minutes)
                        </div>
                        <select
                            className="waitlistInput"
                            value={quotedWaitMinutes}
                            onChange={(e) =>
                                setQuotedWaitMinutes(e.target.value)
                            }
                        >
                            {QUOTED_WAIT_OPTIONS.map((m) => (
                                <option key={m} value={String(m)}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="waitlistField">
                    <div className="waitlistLabel">Special requests</div>
                    <input
                        className="waitlistInput"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="(optional)"
                    />
                </div>

                <div className="waitlistFormActions">
                    <button
                        type="submit"
                        className="waitlistPrimaryButton"
                        data-action="add"
                        disabled={isBusy}
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        className="waitlistSecondaryButton"
                        data-action="cancel"
                        disabled={isBusy}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}

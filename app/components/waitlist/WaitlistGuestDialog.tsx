import * as React from "react";

import { Modal } from "../../ui/modal";

import { digitsOnly, formatPhone } from "./waitlist-utils";
import type {
    SidebarTable,
    SidebarWaitlistItem,
} from "./waitlist-sidebar-types";

export function WaitlistGuestDialog({
    open,
    guest,
    isBusy,
    isSeatingThisGuest,
    tables,
    onClose,
    onArrived,
    onRemove,
    onEdit,
    onText,
    onSit,
    onCancelSit,
}: {
    open: boolean;
    guest: SidebarWaitlistItem | null;
    isBusy: boolean;
    isSeatingThisGuest: boolean;
    tables: SidebarTable[];
    onClose: () => void;
    onArrived: (id: string) => void;
    onRemove: (id: string) => void;
    onEdit: (values: {
        id: string;
        partyName: string;
        partySize: number;
        phoneNumber: string;
        isCallAhead: boolean;
        preferredTableId: string | null;
        quotedWaitMinutes: number | null;
        notes: string;
    }) => void;
    onText: (id: string) => void;
    onSit: (guest: SidebarWaitlistItem) => void;
    onCancelSit: () => void;
}) {
    if (!open || !guest) return null;

    let arrivedAt = guest.arrivedAt ? new Date(guest.arrivedAt) : null;
    let canText = digitsOnly(guest.phoneNumber ?? "").length > 0;

    let [editMode, setEditMode] = React.useState(false);
    let [partyName, setPartyName] = React.useState(guest.partyName);
    let [partySize, setPartySize] = React.useState(String(guest.partySize));
    let [phoneNumber, setPhoneNumber] = React.useState(guest.phoneNumber ?? "");
    let [isCallAhead, setIsCallAhead] = React.useState(guest.isCallAhead);
    let [preferredTableId, setPreferredTableId] = React.useState<string>(
        guest.preferredTableId ?? "",
    );
    let [quotedWaitMinutes, setQuotedWaitMinutes] = React.useState<string>(
        guest.quotedWaitMinutes != null ? String(guest.quotedWaitMinutes) : "0",
    );
    let [notes, setNotes] = React.useState(guest.notes ?? "");

    React.useEffect(() => {
        setEditMode(false);
        setPartyName(guest.partyName);
        setPartySize(String(guest.partySize));
        setPhoneNumber(guest.phoneNumber ?? "");
        setIsCallAhead(guest.isCallAhead);
        setPreferredTableId(guest.preferredTableId ?? "");
        setQuotedWaitMinutes(
            guest.quotedWaitMinutes != null
                ? String(guest.quotedWaitMinutes)
                : "0",
        );
        setNotes(guest.notes ?? "");
    }, [guest.id]);

    return (
        <Modal
            open={open}
            title={`${guest.partyName} • ${guest.partySize}`}
            onClose={() => {
                if (isBusy) return;
                onClose();
            }}
        >
            <div className="tablesInlineForm">
                <div className="dashboardDialogHint waitlistGuestDialogHint">
                    <div>Phone: {formatPhone(guest.phoneNumber)}</div>
                    <div>
                        Arrived:{" "}
                        {arrivedAt ? arrivedAt.toLocaleTimeString() : "—"}
                    </div>
                    {guest.preferredTableNumber != null ? (
                        <div>Pref: {guest.preferredTableNumber}</div>
                    ) : null}
                    {guest.notes ? (
                        <div className="waitlistGuestNotes">
                            Notes: {guest.notes}
                        </div>
                    ) : null}
                </div>

                {editMode ? (
                    <form
                        className="waitlistInlineEdit"
                        onSubmit={(e) => {
                            e.preventDefault();
                            let size = Number.parseInt(partySize, 10);
                            let quote = quotedWaitMinutes.trim()
                                ? Number.parseInt(quotedWaitMinutes, 10)
                                : null;

                            onEdit({
                                id: guest.id,
                                partyName: partyName.trim(),
                                partySize: Number.isFinite(size) ? size : 0,
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
                            <div className="waitlistLabel">Party size</div>
                            <input
                                className="waitlistInput"
                                inputMode="numeric"
                                value={partySize}
                                onChange={(e) =>
                                    setPartySize(digitsOnly(e.target.value))
                                }
                            />
                        </div>

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

                        {guest.status === "CALL_AHEAD" ? (
                            <label className="waitlistCheckboxRow">
                                <input
                                    type="checkbox"
                                    checked={isCallAhead}
                                    onChange={(e) =>
                                        setIsCallAhead(e.target.checked)
                                    }
                                />
                                Call-Ahead
                            </label>
                        ) : null}

                        <div className="waitlistField">
                            <div className="waitlistLabel">
                                Preferred table (optional)
                            </div>
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

                        <div className="waitlistField">
                            <div className="waitlistLabel">
                                Quoted wait (minutes, optional)
                            </div>
                            <select
                                className="waitlistInput"
                                value={quotedWaitMinutes}
                                onChange={(e) =>
                                    setQuotedWaitMinutes(e.target.value)
                                }
                            >
                                {[
                                    0,
                                    ...Array.from(
                                        { length: 12 },
                                        (_, i) => (i + 1) * 5,
                                    ),
                                ].map((m) => (
                                    <option key={m} value={String(m)}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="waitlistField">
                            <div className="waitlistLabel">
                                Special requests
                            </div>
                            <input
                                className="waitlistInput"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="tablesInlineActions waitlistDialogActions">
                            <button
                                type="submit"
                                className="tablesPrimaryButton"
                                data-action="save"
                                disabled={isBusy}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="tablesSecondaryButton"
                                disabled={isBusy}
                                onClick={() => setEditMode(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="tablesSecondaryButton"
                                data-action="remove"
                                disabled={isBusy}
                                onClick={() => onRemove(guest.id)}
                            >
                                Remove
                            </button>
                        </div>
                    </form>
                ) : null}

                {!editMode ? (
                    <div className="tablesInlineActions waitlistDialogActions">
                        {guest.isCallAhead && !guest.waitingStartedAt ? (
                            <>
                                <button
                                    type="button"
                                    className="tablesPrimaryButton"
                                    data-action="arrive"
                                    disabled={isBusy}
                                    onClick={() => onArrived(guest.id)}
                                >
                                    Mark arrived
                                </button>

                                <button
                                    type="button"
                                    className="tablesSecondaryButton"
                                    data-action="text"
                                    disabled={isBusy || !canText}
                                    onClick={() => onText(guest.id)}
                                >
                                    Text
                                </button>

                                <button
                                    type="button"
                                    className="tablesSecondaryButton"
                                    data-action="edit"
                                    disabled={isBusy}
                                    onClick={() => setEditMode(true)}
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="tablesSecondaryButton"
                                    data-action="remove"
                                    disabled={isBusy}
                                    onClick={() => onRemove(guest.id)}
                                >
                                    Remove
                                </button>
                            </>
                        ) : (
                            <>
                                {!guest.isCallAhead ||
                                guest.waitingStartedAt ? (
                                    !isSeatingThisGuest ? (
                                        <button
                                            type="button"
                                            className="tablesPrimaryButton"
                                            data-action="sit"
                                            disabled={isBusy}
                                            onClick={() => onSit(guest)}
                                        >
                                            Sit
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="tablesSecondaryButton"
                                            disabled={isBusy}
                                            onClick={onCancelSit}
                                        >
                                            Cancel
                                        </button>
                                    )
                                ) : null}

                                <button
                                    type="button"
                                    className="tablesSecondaryButton"
                                    data-action="text"
                                    disabled={isBusy || !canText}
                                    onClick={() => onText(guest.id)}
                                >
                                    Text
                                </button>

                                <button
                                    type="button"
                                    className="tablesSecondaryButton"
                                    data-action="edit"
                                    disabled={isBusy}
                                    onClick={() => setEditMode(true)}
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="tablesSecondaryButton"
                                    data-action="remove"
                                    disabled={isBusy}
                                    onClick={() => onRemove(guest.id)}
                                >
                                    Remove
                                </button>
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}

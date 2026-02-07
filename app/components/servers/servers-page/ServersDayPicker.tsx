import * as React from "react";
import { Form, useSubmit } from "react-router";

export function ServersDayPicker({ serviceDay }: { serviceDay: string }) {
    let submit = useSubmit();

    return (
        <Form method="get" className="historyControls">
            <label className="historyDateLabel">
                Day
                <input
                    className="historyDateInput"
                    type="date"
                    name="day"
                    value={serviceDay}
                    onChange={(e) => submit(e.currentTarget.form)}
                />
            </label>
        </Form>
    );
}

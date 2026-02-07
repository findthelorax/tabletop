export type WaitlistActionResult =
    | { ok: true }
    | {
          ok: false;
          formError?: string;
          fieldErrors?: Record<string, string>;
      };

export type WaitlistActionErrorPayload = Extract<
    WaitlistActionResult,
    { ok: false }
>;

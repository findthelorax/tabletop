import type { FetcherWithComponents } from "react-router";

export type ActionResult =
    | { ok: true }
    | {
          ok: false;
          formError?: string;
          fieldErrors?: Record<string, string>;
      };

export type ActionFetcher = FetcherWithComponents<ActionResult>;

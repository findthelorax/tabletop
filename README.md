# TableTop — Restaurant Table Management

TableTop is a modern full-stack restaurant table management system built with React Router (the successor to Remix v2), TypeScript, Postgres, and Prisma.

I built TableTop for one reason: **help hosts move fast during service**.

Most restaurant software makes simple tasks feel “form-y” and click-heavy. TableTop is designed around fast interaction and visibility — the goal is the **least number of clicks** to complete the common objectives: add a party, seat them, update tables, and keep sections flowing.

It’s designed for the “during service” workflow: track table status, manage a waitlist, seat parties quickly, and review performance metrics like table averages and server history.

## Why TableTop

- **Low friction:** optimize the common host actions for speed (fewer clicks, fewer modals)
- **Real-time clarity:** table state (including clean/dirty) stays obvious at a glance
- **Useful metrics:** section/server performance stats that help pacing and coaching

## What you can do

- **Dashboard:** service-day overview + quick actions
- **Waitlist:** add parties, update status, seat parties, and optionally text guests
- **Tables:** create/edit tables, manage **clean/dirty** status, combine/uncombine tables
- **Floorplan:** visualize sections/tables and update state fast
- **Servers + History:** server shift history, table averages, and per-section metrics like **guest count** and **table count** per server
- **Settings:** basic configuration

## Tech stack

- React Router (SSR + loaders/actions)
- TypeScript
- Postgres (Docker for local dev)
- Prisma
- Plain CSS in `app/styles/`

import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    route("login", "routes/login.tsx"),
    route("live", "routes/live.tsx"),
    route("dashboard", "routes/dashboard-redirect.tsx"),
    index("routes/dashboard.tsx"),
    route("waitlist", "routes/waitlist.tsx"),
    route("waitlist/sidebar", "routes/waitlist.sidebar.tsx"),
    route("floorplan", "routes/floorplan.tsx"),
    route("tables", "routes/tables.tsx"),
    route("servers", "routes/servers.tsx"),
    route("history", "routes/history.tsx"),
    route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;

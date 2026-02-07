import { createCookie } from "react-router";

export const dashboardFloorplanCookie = createCookie("dashboardFloorplanId", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
});

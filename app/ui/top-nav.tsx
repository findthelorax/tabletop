import * as React from "react";
import { NavLink } from "react-router";

import { TopNavClock } from "./top-nav-clock";

export function TopNav({
    brand,
    themeToggle,
}: {
    brand: string;
    themeToggle: React.ReactNode;
}) {
    return (
        <header className="topNav">
            <div className="topNavBrand">{brand}</div>

            <nav className="topNavLinks" aria-label="Top navigation">
                <NavLink to="/" end className="navLink">
                    Dashboard
                </NavLink>
                <NavLink to="/waitlist" className="navLink">
                    Waitlist
                </NavLink>
                <NavLink to="/floorplan" className="navLink">
                    Floorplan
                </NavLink>
                <NavLink to="/tables" className="navLink">
                    Tables
                </NavLink>
                <NavLink to="/servers" className="navLink">
                    Servers
                </NavLink>
                <NavLink to="/history" className="navLink">
                    History
                </NavLink>
                <NavLink to="/settings" className="navLink">
                    Settings
                </NavLink>
            </nav>

            <TopNavClock />

            {themeToggle}
        </header>
    );
}

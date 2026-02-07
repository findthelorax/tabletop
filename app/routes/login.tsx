import * as React from "react";
import { Form, redirect, useActionData } from "react-router";

import type { Route } from "./+types/login";
import {
    getAuthSession,
    isAuthenticated,
    loginWithRestaurantCreds,
} from "../utils/auth.server";

type ActionData =
    | { ok: true }
    | {
          ok: false;
          formError: string;
      };

function safeRedirectTo(value: string | null | undefined) {
    if (!value) return "/";
    if (!value.startsWith("/")) return "/";
    return value;
}

export async function loader({ request }: Route.LoaderArgs) {
    let session = await getAuthSession(request);
    if (!isAuthenticated(session)) return null;

    throw redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
    let formData = await request.formData();

    let username = String(formData.get("username") ?? "").trim();
    let password = String(formData.get("password") ?? "");
    let url = new URL(request.url);
    let redirectTo = safeRedirectTo(url.searchParams.get("redirectTo"));

    if (!username || !password) {
        return Response.json(
            { ok: false, formError: "Username and password are required" },
            { status: 400 },
        );
    }

    return loginWithRestaurantCreds({
        request,
        username,
        password,
        redirectTo,
    });
}

export default function Login(_: Route.ComponentProps) {
    let actionData = useActionData() as ActionData | undefined;

    return (
        <div className="loginPage">
            <div className="loginCard">
                <h1 className="pageTitle">Sign in</h1>
                <p className="pageSubtitle">Enter your app credentials.</p>

                {actionData && !actionData.ok ? (
                    <div className="loginError" role="alert">
                        {actionData.formError}
                    </div>
                ) : null}

                <Form method="post" className="loginForm">
                    <label className="loginLabel">
                        Username
                        <input
                            className="loginInput"
                            name="username"
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label className="loginLabel">
                        Password
                        <input
                            className="loginInput"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    <button className="loginButton" type="submit">
                        Sign in
                    </button>
                </Form>
            </div>
        </div>
    );
}

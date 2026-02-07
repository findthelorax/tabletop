import type { Route } from "./+types/settings";
import * as React from "react";
import { Form, useActionData, useLoaderData } from "react-router";

import { requireRestaurantId } from "../utils/auth.server";
import { getPrisma } from "../utils/db.server";
import { hashPassword } from "../utils/password.server";
import { getPrismaErrorInfo } from "../services/prisma-errors.server";

type ActionData =
    | { ok: true; createdRestaurant: { storeNumber: number; name: string } }
    | { ok: false; formError: string };

export async function loader({ request }: Route.LoaderArgs) {
    let restaurantId = await requireRestaurantId(request);
    let prisma = getPrisma() as any;

    // Admin bootstrap restaurant: storeNumber=1.
    let restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { storeNumber: true, loginUsername: true, name: true },
    });

    let storeNumber = restaurant?.storeNumber ?? null;

    return {
        storeNumber,
        isProvisioningAdmin: storeNumber === 1,
        restaurantName: restaurant?.name ?? null,
        loginUsername: restaurant?.loginUsername ?? null,
    };
}

export async function action({ request }: Route.ActionArgs) {
    let restaurantId = await requireRestaurantId(request);
    let formData = await request.formData();
    let intent = String(formData.get("intent") ?? "");

    if (intent !== "create-restaurant") {
        return Response.json(
            { ok: false, formError: "Unknown action" } satisfies ActionData,
            { status: 400 },
        );
    }

    let prisma = getPrisma() as any;

    let current = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { storeNumber: true },
    });

    if (current?.storeNumber !== 1) {
        return Response.json(
            {
                ok: false,
                formError: "Not authorized to create restaurants",
            } satisfies ActionData,
            { status: 403 },
        );
    }

    let name = String(formData.get("name") ?? "").trim();
    let storeNumberRaw = String(formData.get("storeNumber") ?? "").trim();
    let loginUsername = String(formData.get("loginUsername") ?? "").trim();
    let password = String(formData.get("password") ?? "");

    if (!name) {
        return Response.json(
            { ok: false, formError: "Restaurant name is required" },
            { status: 400 },
        );
    }

    if (!/^\d+$/.test(storeNumberRaw)) {
        return Response.json(
            { ok: false, formError: "Store number must be a whole number" },
            { status: 400 },
        );
    }

    let storeNumber = Number.parseInt(storeNumberRaw, 10);
    if (!Number.isFinite(storeNumber) || storeNumber <= 0) {
        return Response.json(
            { ok: false, formError: "Store number must be at least 1" },
            { status: 400 },
        );
    }

    if (!password || password.trim().length < 6) {
        return Response.json(
            {
                ok: false,
                formError: "Password must be at least 6 characters",
            },
            { status: 400 },
        );
    }

    // Default loginUsername to storeNumber string.
    if (!loginUsername) loginUsername = String(storeNumber);

    let hashed = hashPassword(password);

    try {
        await prisma.restaurant.create({
            data: {
                name,
                storeNumber,
                loginUsername,
                passwordSalt: hashed.salt,
                passwordHash: hashed.hash,
            },
            select: { id: true },
        });

        return Response.json(
            { ok: true, createdRestaurant: { storeNumber, name } },
            { status: 200 },
        );
    } catch (error) {
        let { code } = getPrismaErrorInfo(error);
        if (code === "P2002") {
            return Response.json(
                {
                    ok: false,
                    formError:
                        "That store number or login username already exists",
                } satisfies ActionData,
                { status: 400 },
            );
        }

        return Response.json(
            {
                ok: false,
                formError:
                    error instanceof Error
                        ? error.message
                        : "Could not create restaurant",
            } satisfies ActionData,
            { status: 500 },
        );
    }
}

export default function Settings(_: Route.ComponentProps) {
    let data = useLoaderData<typeof loader>();
    let actionData = useActionData() as ActionData | undefined;

    return (
        <div className="page">
            <h1 className="pageTitle">Settings</h1>
            <p className="pageSubtitle">
                Configure your restaurant and staff preferences.
            </p>

            {data.isProvisioningAdmin ? (
                <div style={{ marginTop: 24 }}>
                    <h2 className="pageTitle" style={{ fontSize: 18 }}>
                        Provision Restaurant
                    </h2>
                    <p className="pageSubtitle">
                        Creates a new restaurant login (store-scoped tenant).
                    </p>

                    {actionData && !actionData.ok ? (
                        <div className="loginError" role="alert">
                            {actionData.formError}
                        </div>
                    ) : null}

                    {actionData && actionData.ok ? (
                        <div className="loginError" role="status">
                            Created restaurant: #
                            {actionData.createdRestaurant.storeNumber} —{" "}
                            {actionData.createdRestaurant.name}
                        </div>
                    ) : null}

                    <Form method="post" className="loginForm">
                        <input
                            type="hidden"
                            name="intent"
                            value="create-restaurant"
                        />

                        <label className="loginLabel">
                            Store number
                            <input
                                className="loginInput"
                                name="storeNumber"
                                inputMode="numeric"
                                required
                            />
                        </label>

                        <label className="loginLabel">
                            Restaurant name
                            <input
                                className="loginInput"
                                name="name"
                                required
                            />
                        </label>

                        <label className="loginLabel">
                            Login username (optional)
                            <input
                                className="loginInput"
                                name="loginUsername"
                                placeholder="Defaults to store number"
                            />
                        </label>

                        <label className="loginLabel">
                            Password
                            <input
                                className="loginInput"
                                type="password"
                                name="password"
                                autoComplete="new-password"
                                required
                            />
                        </label>

                        <button className="loginButton" type="submit">
                            Create restaurant
                        </button>
                    </Form>
                </div>
            ) : null}
        </div>
    );
}

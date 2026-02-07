type TwilioConfig = {
    accountSid: string;
    authToken: string;
    fromNumber?: string;
    messagingServiceSid?: string;
};

type TextBeeConfig = {
    apiKey: string;
    deviceId: string;
    baseUrl: string;
};

type SmsProvider = "twilio" | "textbee";

function smsDebugEnabled(): boolean {
    return process.env.SMS_DEBUG?.trim().toLowerCase() === "true";
}

function maskE164(e164: string): string {
    // Avoid dumping full phone numbers into logs.
    // Example: +15551234567 -> +1******4567
    if (!e164.startsWith("+")) return "***";
    let digits = e164.slice(1);
    if (digits.length <= 4) return "+***";
    let last4 = digits.slice(-4);
    let prefix = digits.slice(0, Math.min(2, digits.length - 4));
    return `+${prefix}${"*".repeat(Math.max(0, digits.length - prefix.length - 4))}${last4}`;
}

function isLikelyTwilioSid(prefix: string, value: string): boolean {
    return new RegExp(`^${prefix}[A-Za-z0-9]{32}$`).test(value);
}

function readTwilioConfig(): TwilioConfig | null {
    let accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    let authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

    if (!accountSid || !authToken) return null;

    // Common misconfig: setting the Messaging Service SID (MG...) into ACCOUNT_SID.
    if (isLikelyTwilioSid("MG", accountSid)) {
        throw new Error(
            "TWILIO_ACCOUNT_SID looks like a Messaging Service SID (starts with MG). Set TWILIO_ACCOUNT_SID to your Account SID (starts with AC), and put the MG... value in TWILIO_MESSAGING_SERVICE_SID (or use TWILIO_FROM_NUMBER instead).",
        );
    }

    if (!isLikelyTwilioSid("AC", accountSid)) {
        throw new Error(
            "TWILIO_ACCOUNT_SID must be your Twilio Account SID (starts with AC).",
        );
    }

    let fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
    let messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

    if (fromNumber && !/^\+\d{10,15}$/.test(fromNumber)) {
        throw new Error(
            "TWILIO_FROM_NUMBER must be in E.164 format (for example +18446605677).",
        );
    }

    if (messagingServiceSid && !isLikelyTwilioSid("MG", messagingServiceSid)) {
        throw new Error(
            "TWILIO_MESSAGING_SERVICE_SID must be a Messaging Service SID (starts with MG).",
        );
    }

    // Require exactly one sender identity.
    if (!!fromNumber === !!messagingServiceSid) return null;

    return {
        accountSid,
        authToken,
        fromNumber: fromNumber || undefined,
        messagingServiceSid: messagingServiceSid || undefined,
    };
}

function readTextBeeConfig(): TextBeeConfig | null {
    let apiKey = process.env.TEXTBEE_API_KEY?.trim();
    let deviceId = process.env.TEXTBEE_DEVICE_ID?.trim();
    let baseUrl =
        process.env.TEXTBEE_BASE_URL?.trim() ||
        "https://api.textbee.dev/api/v1";

    if (!apiKey || !deviceId) return null;

    // Keep it simple; only normalize trailing slash.
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

    return { apiKey, deviceId, baseUrl };
}

function readSmsProvider(): SmsProvider | null {
    let provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
    if (provider === "twilio" || provider === "textbee") return provider;

    // If not explicitly set, pick the first configured provider.
    if (readTextBeeConfig()) return "textbee";
    if (readTwilioConfig()) return "twilio";
    return null;
}

function toE164USFrom10Digits(phone10: string): string {
    // Stored phone numbers are normalized to 10 digits in waitlist.server.ts.
    if (!/^\d{10}$/.test(phone10)) {
        throw new Error("Phone number must be 10 digits");
    }
    return `+1${phone10}`;
}

function encodeFormUrl(values: Record<string, string>): string {
    let params = new URLSearchParams();
    for (let [k, v] of Object.entries(values)) params.set(k, v);
    return params.toString();
}

async function twilioSendSms(args: {
    toE164: string;
    body: string;
}): Promise<{ sid: string } | null> {
    let cfg = readTwilioConfig();
    if (!cfg) return null;

    let url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
        cfg.accountSid,
    )}/Messages.json`;

    let payload: Record<string, string> = {
        To: args.toE164,
        Body: args.body,
    };

    if (cfg.fromNumber) payload.From = cfg.fromNumber;
    if (cfg.messagingServiceSid)
        payload.MessagingServiceSid = cfg.messagingServiceSid;

    let auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString(
        "base64",
    );

    let res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodeFormUrl(payload),
    });

    let text = await res.text();
    if (!res.ok) {
        // Twilio sends JSON even on error, but keep it simple and readable.
        throw new Error(`Twilio SMS failed (${res.status}): ${text}`);
    }

    try {
        let json = JSON.parse(text) as any;
        let sid = typeof json?.sid === "string" ? json.sid : "";
        if (smsDebugEnabled()) {
            console.info("[sms] twilio", {
                to: args.toE164,
                sid,
                status:
                    typeof json?.status === "string" ? json.status : undefined,
            });
        }
        return { sid };
    } catch {
        if (smsDebugEnabled()) {
            console.info("[sms] twilio", { to: args.toE164, sid: "" });
        }
        return { sid: "" };
    }
}

async function textBeeSendSms(args: {
    toE164: string;
    body: string;
}): Promise<{ sid: string; status?: string } | null> {
    let cfg = readTextBeeConfig();
    if (!cfg) return null;

    let url = `${cfg.baseUrl}/gateway/devices/${encodeURIComponent(
        cfg.deviceId,
    )}/send-sms`;

    let res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": cfg.apiKey,
        },
        body: JSON.stringify({
            recipients: [args.toE164],
            message: args.body,
        }),
    });

    let text = await res.text();
    if (!res.ok) {
        throw new Error(`TextBee SMS failed (${res.status}): ${text}`);
    }

    try {
        let json = JSON.parse(text) as any;
        let sid =
            typeof json?.data?._id === "string"
                ? json.data._id
                : typeof json?._id === "string"
                  ? json._id
                  : "";
        let status =
            typeof json?.data?.status === "string"
                ? json.data.status
                : typeof json?.status === "string"
                  ? json.status
                  : undefined;

        if (smsDebugEnabled()) {
            console.info("[sms] textbee", {
                to: args.toE164,
                sid,
                status,
                deviceId: cfg.deviceId,
            });
        }

        return { sid, status };
    } catch {
        if (smsDebugEnabled()) {
            console.info("[sms] textbee", {
                to: args.toE164,
                sid: "",
                deviceId: cfg.deviceId,
            });
        }
        return { sid: "" };
    }
}

export async function sendWaitlistTableReadyText(args: {
    phoneNumber10: string;
    partyName?: string | null;
}): Promise<void> {
    let toE164 = toE164USFrom10Digits(args.phoneNumber10);

    let name = (args.partyName ?? "").trim();
    let greeting = name ? `Hi ${name}, ` : "Hi, ";
    let body = `${greeting}your table is ready. Please check in with the host stand.`;

    let provider = readSmsProvider();
    if (!provider) {
        throw new Error(
            "Texting is not configured. Set SMS_PROVIDER to 'textbee' or 'twilio' and provide that provider's env vars.",
        );
    }

    if (provider === "textbee") {
        let sent = await textBeeSendSms({ toE164, body });
        if (!sent) {
            throw new Error(
                "TextBee texting is not configured. Set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID (and optionally TEXTBEE_BASE_URL).",
            );
        }

        console.info("[sms] sent", {
            provider,
            to: maskE164(toE164),
            sid: sent.sid,
            status: sent.status,
        });

        if (smsDebugEnabled()) {
            console.info("[sms] queued", {
                provider,
                to: toE164,
                sid: sent.sid,
                status: sent.status,
            });
        }
        return;
    }

    let sent = await twilioSendSms({ toE164, body });
    if (!sent) {
        // Config missing or ambiguous (From vs MessagingServiceSid).
        throw new Error(
            "Twilio texting is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and exactly one of TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
        );
    }

    console.info("[sms] sent", {
        provider,
        to: maskE164(toE164),
        sid: sent.sid,
    });

    if (smsDebugEnabled()) {
        console.info("[sms] queued", { provider, to: toE164, sid: sent.sid });
    }
}

export function toTitleCaseName(input: string): string {
    let normalized = String(input ?? "")
        .trim()
        .replace(/\s+/g, " ");

    if (!normalized) return "";

    return normalized
        .split(" ")
        .map((word) => titleCaseWord(word))
        .join(" ");
}

function titleCaseWord(word: string): string {
    // Keep short all-caps parts like "DJ" or "II" as-is.
    let hasLetter = /[A-Za-z]/.test(word);
    if (hasLetter && word === word.toUpperCase() && word.length <= 3) {
        return word;
    }

    // Title-case around common separators like O'Neil or Mary-Jane.
    let parts = word.split(/([\-'’])/g);

    return parts
        .map((part) => {
            if (part === "-" || part === "'" || part === "’") return part;
            if (!part) return part;
            let lower = part.toLowerCase();
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("");
}

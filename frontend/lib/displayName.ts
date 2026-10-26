const ACRONYMS = new Set([
  "xl",
  "xxl",
  "xxxl",
  "xs",
  "xxs",
  "gsm",
  "tc",
  "pc",
  "pvt",
  "ltd",
  "llp",
  "inc",
  "co",
]);

function formatWord(word: string): string {
  if (!word) return word;

  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  if (/^[A-Z0-9&.]+$/.test(word) && word.length <= 5) return word;

  return lower.replace(
    /(^|[-'’])(\p{L})/gu,
    (_match, prefix: string, letter: string) => {
      return prefix + letter.toUpperCase();
    },
  );
}

export function formatDisplayName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "—";

  return trimmed
    .split(" ")
    .map((word) => word.split("-").map(formatWord).join("-"))
    .join(" ");
}

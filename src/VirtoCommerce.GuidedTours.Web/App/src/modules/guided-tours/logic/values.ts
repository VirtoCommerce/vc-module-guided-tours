/** A form field's value as a number, or undefined when the field is empty or not a number. */
export function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export const toText = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

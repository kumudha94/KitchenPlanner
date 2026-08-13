// Ingredient quantities are free text ("2 cups", "1 1/2 tbsp", "a pinch").
// This parses just the leading numeric part (int, decimal, simple or mixed
// fraction) so it can be scaled for a different serving count, leaving
// anything unparseable alone rather than guessing at it.
const LEADING_NUMBER = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/;

function parseQuantity(quantity: string): { amount: number; unit: string } | null {
  const match = quantity.trim().match(LEADING_NUMBER);
  if (!match) return null;

  const [, numberPart, unit] = match;
  let amount: number;
  if (numberPart.includes(" ")) {
    const [whole, frac] = numberPart.split(" ");
    const [n, d] = frac.split("/").map(Number);
    amount = Number(whole) + n / d;
  } else if (numberPart.includes("/")) {
    const [n, d] = numberPart.split("/").map(Number);
    amount = n / d;
  } else {
    amount = Number(numberPart);
  }
  if (!Number.isFinite(amount)) return null;
  return { amount, unit: unit.trim() };
}

export function scaleQuantity(quantity: string, ratio: number): string {
  const parsed = parseQuantity(quantity);
  if (!parsed) return quantity;
  const scaled = parsed.amount * ratio;
  const rounded = Math.round(scaled * 100) / 100;
  const amountStr = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return parsed.unit ? `${amountStr} ${parsed.unit}` : amountStr;
}

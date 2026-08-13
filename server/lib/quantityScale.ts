// Ingredient quantities are free text ("2 cups", "1 1/2 tbsp", "a pinch").
// This parses just the leading numeric part (int, decimal, simple or mixed
// fraction) so it can be scaled or summed, leaving anything unparseable
// alone rather than guessing at it.
const LEADING_NUMBER = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/;

export function parseQuantity(quantity: string): { amount: number; unit: string } | null {
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

export function formatQuantity(amount: number, unit: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const amountStr = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return unit ? `${amountStr} ${unit}` : amountStr;
}

export function scaleQuantity(quantity: string, ratio: number): string {
  const parsed = parseQuantity(quantity);
  if (!parsed) return quantity;
  return formatQuantity(parsed.amount * ratio, parsed.unit);
}

// Merges same-named ingredients from multiple recipes/occurrences into one
// line. When every quantity for a name shares a parseable unit, the amounts
// are summed ("2 cups" + "1 cup" -> "3 cups"); otherwise the distinct
// quantity strings are just joined so nothing is silently dropped.
export function mergeIngredientQuantities(
  items: { name: string; quantity: string }[]
): { name: string; quantity: string }[] {
  const groups = new Map<string, { displayName: string; quantities: string[] }>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const group = groups.get(key);
    if (group) group.quantities.push(item.quantity);
    else groups.set(key, { displayName: item.name.trim(), quantities: [item.quantity] });
  }

  const merged: { name: string; quantity: string }[] = [];
  for (const { displayName, quantities } of Array.from(groups.values())) {
    const parsed: { amount: number; unit: string }[] = [];
    for (const q of quantities) {
      const p = parseQuantity(q);
      if (p) parsed.push(p);
    }
    const sameUnit =
      parsed.length === quantities.length &&
      parsed.every((p) => p.unit.toLowerCase() === parsed[0].unit.toLowerCase());

    if (sameUnit) {
      const total = parsed.reduce((sum, p) => sum + p.amount, 0);
      merged.push({ name: displayName, quantity: formatQuantity(total, parsed[0].unit) });
    } else {
      merged.push({ name: displayName, quantity: Array.from(new Set(quantities)).join(" + ") });
    }
  }
  return merged;
}

import { GROCERY_CATEGORIES, type GroceryCategory } from "@shared/schema";

// Small keyword heuristic, not AI — good enough to sort a personal grocery
// list into sections without asking the user to categorize every item by
// hand. Falls back to "Other" for anything unrecognized.
const KEYWORD_RULES: [GroceryCategory, string[]][] = [
  [
    "Produce",
    [
      "tomato", "onion", "garlic", "potato", "carrot", "spinach", "lettuce", "cucumber",
      "pepper", "chili", "chilli", "coriander", "cilantro", "mint", "lemon", "lime", "apple",
      "banana", "mango", "grape", "berry", "berries", "avocado", "broccoli", "cauliflower",
      "cabbage", "beans", "peas", "corn", "ginger", "curry leaves", "greens", "fruit", "vegetable",
    ],
  ],
  ["Dairy & Eggs", ["milk", "cheese", "butter", "yogurt", "yoghurt", "curd", "cream", "paneer", "egg", "ghee"]],
  [
    "Meat & Seafood",
    ["chicken", "mutton", "beef", "pork", "fish", "shrimp", "prawn", "bacon", "sausage", "meat"],
  ],
  ["Bakery", ["bread", "bun", "bagel", "tortilla", "naan", "roti", "pastry", "cake"]],
  ["Frozen", ["frozen", "ice cream", "peas (frozen)"]],
  [
    "Pantry",
    [
      "rice", "flour", "atta", "sugar", "salt", "oil", "dal", "lentil", "pasta", "noodle",
      "spice", "masala", "cumin", "turmeric", "pepper powder", "sauce", "vinegar", "honey",
      "cereal", "oats", "tea", "coffee", "can", "tin", "nuts", "seeds",
    ],
  ],
];

export function categorizeItem(name: string): GroceryCategory {
  const lower = name.toLowerCase();
  for (const [category, keywords] of KEYWORD_RULES) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Other";
}

export function isValidCategory(value: string): value is GroceryCategory {
  return (GROCERY_CATEGORIES as readonly string[]).includes(value);
}

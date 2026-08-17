import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type ParsedRecipeFromImage = {
  name: string;
  servings: number;
  prepTimeMinutes: number;
  ingredients: { name: string; quantity: string }[];
  notes: string;
  tags: string[];
};

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Recipe title, cleaned of hashtags, emoji, and marketing text",
    },
    servings: {
      type: "integer",
      description: "Number of servings the recipe makes; use 4 if not stated",
    },
    prepTimeMinutes: {
      type: "integer",
      description: "Total prep + cook time in minutes; use 0 if not stated anywhere",
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: {
            type: "string",
            description: "Quantity as written, e.g. '1 cup', '2', 'as needed', 'a few'",
          },
        },
        required: ["name", "quantity"],
        additionalProperties: false,
      },
    },
    notes: {
      type: "string",
      description:
        "Cooking method/steps condensed into short plain text (numbered steps are fine); empty string if no method is visible",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "0-3 short tags such as Vegetarian, Quick, Spicy; empty array if unsure",
    },
  },
  required: ["name", "servings", "prepTimeMinutes", "ingredients", "notes", "tags"],
  additionalProperties: false,
} as const;

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function parseRecipeFromImage(
  buffer: Buffer,
  mediaType: string
): Promise<ParsedRecipeFromImage> {
  if (!anthropic) {
    throw new Error("Recipe import is not configured (ANTHROPIC_API_KEY missing).");
  }
  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`Unsupported image type: ${mediaType}`);
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2000,
    output_config: { format: { type: "json_schema", schema: RECIPE_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: "This is a screenshot of a recipe post (likely from Instagram or a similar social app). Extract the recipe into structured data. Ignore the username, caption fluff, engagement stats (likes/comments), hashtags, and boilerplate like 'See translation'. Flatten ingredients from any subsections (e.g. 'For the sauce', 'For grinding paste') into one list, dropping the subsection headers themselves.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Recipe import failed: no response from model.");
  }
  return JSON.parse(textBlock.text) as ParsedRecipeFromImage;
}

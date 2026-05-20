import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  type: z.enum(["cash", "checking", "savings", "credit_card", "investment", "loan", "other"]),
  currency: z.string().length(3, "Must be a 3-letter currency code").default("UGX"),
  openingBalance: z.number().int().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional().nullable(),
  icon: z.string().max(4).optional().nullable(), // emoji
  includeInTotal: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type AccountInput = z.infer<typeof accountSchema>;

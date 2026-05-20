import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int().positive("Amount must be positive"),
  currency: z.string().length(3).default("UGX"),
  accountId: z.string().min(1, "Account is required"),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  date: z.string().datetime({ offset: true }).or(z.string().date()),
  note: z.string().max(200).optional().nullable(),
  isPending: z.boolean().default(false),
  labelIds: z.array(z.string()).default([]),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

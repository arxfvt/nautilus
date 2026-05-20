"use client";

import Dexie, { type Table } from "dexie";

export interface PendingMutation {
  id?: number;
  method: "POST" | "PATCH" | "DELETE";
  endpoint: string;
  payload: unknown;
  resourceId?: string;
  createdAt: number;
  retries: number;
}

export interface LocalTransaction {
  id: string;
  userId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  date: string;
  note?: string;
  isPending: boolean;
  synced: boolean;
  updatedAt: number;
}

export interface LocalAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: number;
  color?: string;
  icon?: string;
  includeInTotal: boolean;
  synced: boolean;
}

class NautilusDB extends Dexie {
  pendingMutations!: Table<PendingMutation>;
  transactions!: Table<LocalTransaction>;
  accounts!: Table<LocalAccount>;

  constructor() {
    super("nautilus");
    this.version(1).stores({
      pendingMutations: "++id, createdAt",
      transactions: "id, accountId, date, synced",
      accounts: "id",
    });
  }
}

export const db = new NautilusDB();

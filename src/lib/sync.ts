"use client";

import { db } from "./db";

export async function flushPendingMutations(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const pending = await db.pendingMutations.orderBy("createdAt").toArray();

  for (const mutation of pending) {
    try {
      const res = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: { "Content-Type": "application/json" },
        body:
          mutation.method !== "DELETE"
            ? JSON.stringify(mutation.payload)
            : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db.pendingMutations.delete(mutation.id!);
    } catch {
      await db.pendingMutations.update(mutation.id!, {
        retries: mutation.retries + 1,
      });
      break; // maintain order — stop on first failure
    }
  }
}

export async function queueMutation(
  method: "POST" | "PATCH" | "DELETE",
  endpoint: string,
  payload?: unknown,
  resourceId?: string
): Promise<void> {
  await db.pendingMutations.add({
    method,
    endpoint,
    payload,
    resourceId,
    createdAt: Date.now(),
    retries: 0,
  });

  if (navigator.onLine) {
    await flushPendingMutations();
  }
}

export async function getPendingCount(): Promise<number> {
  return db.pendingMutations.count();
}

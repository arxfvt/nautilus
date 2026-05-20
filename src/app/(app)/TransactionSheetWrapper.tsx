"use client";

import { useState } from "react";
import { FAB } from "@/components/layout/FAB";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";

export function TransactionSheetWrapper() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FAB onClick={() => setOpen(true)} />
      <TransactionSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

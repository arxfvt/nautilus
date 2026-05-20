import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  addDays, addWeeks, addMonths, addQuarters, addYears,
  parseISO, isAfter,
} from "date-fns";

function advanceDueDate(current: Date, frequency: string): Date {
  switch (frequency) {
    case "daily":     return addDays(current, 1);
    case "weekly":    return addWeeks(current, 1);
    case "biweekly":  return addWeeks(current, 2);
    case "monthly":   return addMonths(current, 1);
    case "quarterly": return addQuarters(current, 1);
    case "yearly":    return addYears(current, 1);
    default:          return addMonths(current, 1);
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueRules = await prisma.recurringRule.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: today },
    },
  });

  let processed = 0;
  let errors = 0;

  for (const rule of dueRules) {
    try {
      if (rule.autoConfirm) {
        await prisma.transaction.create({
          data: {
            userId: rule.userId,
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.accountId,
            toAccountId: rule.toAccountId,
            categoryId: rule.categoryId,
            date: rule.nextDueDate,
            note: rule.note,
            recurringRuleId: rule.id,
            isPending: false,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: rule.userId,
            type: "planned_payment_due",
            title: `${rule.name} is due`,
            body: `A planned payment of ${rule.amount} ${rule.currency} is due today.`,
            relatedId: rule.id,
            relatedType: "recurring_rule",
          },
        });
      }

      const nextDue = advanceDueDate(rule.nextDueDate, rule.frequency);
      const shouldDeactivate = rule.endDate && isAfter(nextDue, rule.endDate);

      await prisma.recurringRule.update({
        where: { id: rule.id },
        data: {
          nextDueDate: nextDue,
          ...(shouldDeactivate && { isActive: false }),
        },
      });

      processed++;
    } catch {
      errors++;
    }
  }

  // Refresh exchange rates from Frankfurter API
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,UGX,KES,TZS");
    if (res.ok) {
      const data = await res.json();
      const rates: { base: string; target: string; rate: number }[] = [];

      for (const [target, rate] of Object.entries(data.rates as Record<string, number>)) {
        rates.push({ base: "EUR", target, rate });
        rates.push({ base: target, target: "EUR", rate: 1 / rate });
      }

      for (const r of rates) {
        await prisma.exchangeRate.upsert({
          where: { base_target: { base: r.base, target: r.target } },
          update: { rate: r.rate, fetchedAt: new Date(), isManual: false },
          create: { base: r.base, target: r.target, rate: r.rate, fetchedAt: new Date(), isManual: false },
        });
      }
    }
  } catch {
    // Non-fatal: exchange rate refresh failure
  }

  return NextResponse.json({ processed, errors, total: dueRules.length });
}

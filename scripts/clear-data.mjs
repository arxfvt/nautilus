import pkg from "../src/generated/prisma/index.js";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all financial data...");

  // Order matters — delete dependents first
  await prisma.transactionLabel.deleteMany({});
  console.log("✓ Transaction labels cleared");

  await prisma.transaction.deleteMany({});
  console.log("✓ Transactions cleared");

  await prisma.recurringRule.deleteMany({});
  console.log("✓ Recurring rules cleared");

  await prisma.budgetCategory.deleteMany({});
  await prisma.budget.deleteMany({});
  console.log("✓ Budgets cleared");

  await prisma.account.deleteMany({});
  console.log("✓ Accounts cleared");

  await prisma.notification.deleteMany({});
  console.log("✓ Notifications cleared");

  console.log("\nDone. User accounts and categories are untouched.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

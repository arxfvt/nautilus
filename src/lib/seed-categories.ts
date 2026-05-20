import { prisma } from "./prisma";

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining",      icon: "🍽️",  color: "#F06060" },
  { name: "Transport",          icon: "🚌",  color: "#F0A030" },
  { name: "Shopping",           icon: "🛍️",  color: "#9B8EF2" },
  { name: "Housing & Rent",     icon: "🏠",  color: "#4F8EF8" },
  { name: "Utilities",          icon: "💡",  color: "#3DD68C" },
  { name: "Healthcare",         icon: "💊",  color: "#F06060" },
  { name: "Education",          icon: "📚",  color: "#4F8EF8" },
  { name: "Entertainment",      icon: "🎬",  color: "#9B8EF2" },
  { name: "Personal Care",      icon: "💆",  color: "#3DD68C" },
  { name: "Travel",             icon: "✈️",  color: "#F0A030" },
  { name: "Gifts & Donations",  icon: "🎁",  color: "#F06060" },
  { name: "Business Expenses",  icon: "💼",  color: "#4F8EF8" },
  { name: "Fees & Charges",     icon: "📋",  color: "#7A84A0" },
  { name: "Other",              icon: "📦",  color: "#7A84A0" },
];

const INCOME_CATEGORIES = [
  { name: "Salary",              icon: "💰",  color: "#3DD68C" },
  { name: "Freelance",           icon: "💻",  color: "#4F8EF8" },
  { name: "Business Income",     icon: "🏪",  color: "#3DD68C" },
  { name: "Investment Returns",  icon: "📈",  color: "#F0A030" },
  { name: "Gifts Received",      icon: "🎀",  color: "#9B8EF2" },
  { name: "Other Income",        icon: "💵",  color: "#3DD68C" },
];

export async function seedDefaultCategories(userId: string) {
  const categories = [
    ...EXPENSE_CATEGORIES.map((c, i) => ({ ...c, type: "expense", sortOrder: i, userId, isDefault: true })),
    ...INCOME_CATEGORIES.map((c, i) => ({ ...c, type: "income", sortOrder: i, userId, isDefault: true })),
  ];

  await prisma.category.createMany({ data: categories });
}

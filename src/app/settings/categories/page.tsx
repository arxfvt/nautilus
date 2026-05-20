import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id, isArchived: false },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  return <CategoriesClient initialCategories={categories} />;
}

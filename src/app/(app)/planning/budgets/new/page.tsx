import { TopBar } from "@/components/layout/TopBar";
import { BudgetForm } from "@/components/planning/BudgetForm";

export default function NewBudgetPage() {
  return (
    <>
      <TopBar showBack />
      <BudgetForm />
    </>
  );
}

import { hasAnyRole } from "@/lib/roles";
import { OrderIntakeForm } from "@/components/order-intake-form";
import { currentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function NewOrderPage() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  if (!hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/");
  return <main className="form-shell"><OrderIntakeForm /></main>;
}

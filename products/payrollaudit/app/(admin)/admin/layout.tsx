import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/auth.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { AdminShellClient } from "../../../components/AdminShellClient.js";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { role } = await requireOrganizationContext();
  const isAuthorized = role === "owner" || role === "admin";

  return <AdminShellClient isAuthorized={isAuthorized}>{children}</AdminShellClient>;
}

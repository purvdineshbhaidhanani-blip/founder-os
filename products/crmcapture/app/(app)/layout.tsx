import { redirect } from "next/navigation";
import { getCurrentSession } from "../../lib/auth.js";
import { AppShell } from "../../components/AppShell.js";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}

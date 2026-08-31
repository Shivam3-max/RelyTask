import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PortalShell } from "@/components/layout/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/portal/login");
  if (session.user.role !== "client") redirect("/dashboard");

  return <PortalShell>{children}</PortalShell>;
}

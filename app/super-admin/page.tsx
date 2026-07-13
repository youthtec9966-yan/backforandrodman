import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SuperAdminPanel } from "@/components/SuperAdminPanel";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth/jwt";

export default async function SuperAdminPage() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const session = await verifyAuthToken(token);
  if (session?.role !== "super_admin") {
    redirect("/workspace");
  }
  return <SuperAdminPanel />;
}

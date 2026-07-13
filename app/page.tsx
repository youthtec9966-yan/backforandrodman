import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth/jwt";

export default async function Home() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const session = await verifyAuthToken(token);
  redirect(session?.role === "super_admin" ? "/super-admin" : "/workspace");
}

import { redirect } from "next/navigation";

import { getOptionalActiveUser } from "@/lib/auth/dal";

export const instant = false;

export default async function Home() {
  const user = await getOptionalActiveUser();
  redirect(user ? "/dashboard" : "/login");
}

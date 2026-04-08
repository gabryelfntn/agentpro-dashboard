export type AuthMeResponse = {
  user: { id: string; email?: string | null; displayName: string };
  workspace: { role: "owner" | "employee" | "manager" | "accountant"; ownerUserId: string } | null;
};

export async function fetchAuthMe(): Promise<AuthMeResponse | null> {
  const r = await fetch("/api/auth/me");
  if (!r.ok) return null;
  return (await r.json()) as AuthMeResponse;
}


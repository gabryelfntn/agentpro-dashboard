import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  if (
    pathname === "/connexion" ||
    pathname === "/inscription" ||
    pathname === "/mot-de-passe-oublie" ||
    pathname === "/reinitialiser-mot-de-passe"
  ) {
    return true;
  }
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (pathname === "/sw.js") return true;
  if (pathname === "/pwa-register") return true;
  if (pathname.startsWith("/icons/")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.next();
  }

  const res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          req.cookies.set(c.name, c.value);
          res.cookies.set(c.name, c.value, c.options);
        }
      },
    },
  });

  const pathname = req.nextUrl.pathname;
  if (isPublicPath(pathname)) return res;

  // Refresh session if possible and check auth.
  return supabase.auth.getUser().then(({ data }) => {
    const user = data.user;
    if (user) return res;

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const redirect = req.nextUrl.clone();
    redirect.pathname = "/connexion";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  });
}

export const config = { matcher: ["/((?!.*\\.).*)"] };


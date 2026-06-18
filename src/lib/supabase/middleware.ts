import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectToLogin(request: NextRequest, error?: "config") {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isLogin = request.nextUrl.pathname === "/login";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isLogin) return NextResponse.next({ request });
    return redirectToLogin(request, "config");
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isLogin) {
      return redirectToLogin(request);
    }

    if (user && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch {
    if (isLogin) return NextResponse.next({ request });
    return redirectToLogin(request);
  }
}

import { cookies } from 'next/headers';

const LANG_COOKIE = 'runq.lang';

// Read the user's language preference for SSR rendering. Honor (in order):
// 1. explicit ?lang= query (so links and shares can override),
// 2. the runq.lang cookie written client-side by setLang(),
// 3. default to Chinese.
// Returning the cookie value avoids the SSR-then-flip-on-hydration flash that
// happened when the server always rendered zh and the client re-rendered en.
export async function pageLang(searchParams) {
  const params = await searchParams;
  if (params?.lang === 'en') return 'en';
  if (params?.lang === 'zh') return 'zh';
  try {
    const cookieStore = await cookies();
    const stored = cookieStore.get(LANG_COOKIE)?.value;
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // cookies() unavailable outside a request scope; fall through to default.
  }
  return 'zh';
}


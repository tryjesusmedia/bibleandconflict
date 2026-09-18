import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const oauthRedirectUri = AuthSession.makeRedirectUri({
  scheme: 'bibleandconflict',
  path: 'auth/callback',
});

async function hasActiveSession(retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return true;
    if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 180));
  }
  return false;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: oauthRedirectUri,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('The authentication URL was not returned.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectUri);
  if (result.type !== 'success') return false;

  // Some Android browsers finish writing the Supabase session before the
  // auth-session result reaches the app. Treat that completed sign-in as a
  // success instead of trying to exchange the same callback a second time.
  if (await hasActiveSession()) return true;

  const parsed = new URL(result.url);
  const code = parsed.searchParams.get('code');
  const flowId = parsed.searchParams.get('sb_flow_id');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (exchangeError) {
      if (await hasActiveSession(3)) return true;
      throw exchangeError;
    }
    return true;
  }

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const accessToken = parsed.searchParams.get('access_token') ?? hash.get('access_token');
  const refreshToken = parsed.searchParams.get('refresh_token') ?? hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      if (await hasActiveSession(3)) return true;
      throw sessionError;
    }
    return true;
  }
  return hasActiveSession(3);
}

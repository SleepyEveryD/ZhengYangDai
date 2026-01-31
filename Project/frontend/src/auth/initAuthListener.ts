// src/auth/initAuthListener.ts
import { supabase } from '../lib/supabase'
import { forceLogout } from './forseLogout'
import { setAccessToken } from './authToken'
import { markAuthReady } from "./authReady";


let unsub: (() => void) | null = null

export function initAuthListener() {
  if (unsub) return

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[auth]', event, session?.user?.id)

    // ✅ 关键：任何 auth 变化都同步更新 token
    setAccessToken(session?.access_token ?? null)
    markAuthReady();

    if (event === 'TOKEN_REFRESHED') {
      console.log('token refreshed, expires_at:', session?.expires_at)
    }

    if (event === 'SIGNED_OUT') {
      forceLogout()
    }
  })

  unsub = () => data.subscription.unsubscribe()
}

export function cleanupAuthListener() {
  unsub?.()
  unsub = null
}

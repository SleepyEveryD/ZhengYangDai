import { supabase } from '../lib/supabase'
import { forceLogout } from './forseLogout'

let unsub: (() => void) | null = null

export function initAuthListener() {
  // 防止重复注册
  if (unsub) return

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[auth]', event, session?.user?.id)
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

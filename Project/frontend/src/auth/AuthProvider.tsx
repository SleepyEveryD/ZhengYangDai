//Project/frontend/src/auth/AuthProvider.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContext";
import type { User } from "../types/user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  console.log("🟢 AuthProvider mounted");


  useEffect(() => {
    console.log("🟢 AuthProvider useEffect start");
    // 页面刷新时恢复 session
    supabase.auth.getSession().then(({ data }) => {
        console.log("🟢 getSession result:", data.session);
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email!,
          name:data.session.user.user_metadata.name,
        });
      }
      setLoading(false);
    });

    // 监听登录 / 登出
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name ?? null,
          });
        } else {
          setUser(null);
        }
        
        console.log('session:', session)
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth-store";
import { apiClient } from "../../../shared/lib/api-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!user) {
          const res = await apiClient.post("/auth/refresh");
          if (res.data?.user) {
            setUser(res.data.user);
          }
        }
      } catch {
        // Ignorar, significa que no hay sesión o expiró completamente
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [user, setUser]);

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center">Cargando sesión...</div>;
  }

  return <>{children}</>;
}

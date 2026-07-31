"use client";

import { useAuthStore } from "../../features/auth/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authApi } from "../../features/auth/api/auth.api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !user) {
      router.push("/login");
    }
  }, [user, isMounted, router]);

  if (!isMounted || !user) {
    return null; // or a loading spinner
  }

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-gray-800">
          Daruma Admin
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="block p-2 rounded hover:bg-gray-800">
            Dashboard
          </Link>
          <Link href="/admin/products" className="block p-2 rounded hover:bg-gray-800">
            Productos
          </Link>
          <Link href="/admin/tags" className="block p-2 rounded hover:bg-gray-800">
            Etiquetas
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => handleLogout()}
            className="w-full text-left p-2 rounded hover:bg-red-900 text-red-400"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-8">
        {children}
      </main>
    </div>
  );
}

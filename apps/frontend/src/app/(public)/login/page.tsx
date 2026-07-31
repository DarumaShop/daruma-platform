"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authApi, loginSchema, LoginData } from "../../../features/auth/api/auth.api";
import { useAuthStore } from "../../../features/auth/store/auth-store";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, Suspense } from "react";

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  useEffect(() => {
    if (user) {
      router.push("/admin");
    }
  }, [user, router]);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.user);
      router.push("/admin"); // Redirect to basic admin to test guard
    },
  });

  const onSubmit = (data: LoginData) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96 text-gray-900">
        <h2 className="text-2xl font-bold mb-4">Iniciar Sesión</h2>
        
        {resetSuccess && (
          <div className="bg-green-100 text-green-700 p-2 mb-4 rounded text-sm text-center">
            ¡Tu contraseña ha sido actualizada exitosamente! Inicia sesión.
          </div>
        )}

        {mutation.isError && (
          <div className="bg-red-100 text-red-600 p-2 mb-4 rounded text-sm">
            Credenciales inválidas o error de conexión.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email o Usuario</label>
            <input 
              {...register("identifier")} 
              className="w-full border rounded p-2 text-black"
              placeholder="admin@daruma.com"
            />
            {errors.identifier && <span className="text-red-500 text-xs">{errors.identifier.message}</span>}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input 
              type="password" 
              {...register("password")} 
              className="w-full border rounded p-2 text-black"
            />
            {errors.password && <span className="text-red-500 text-xs">{errors.password.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={mutation.isPending}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Cargando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-sm text-center flex flex-col space-y-2">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/register" className="text-gray-600 hover:underline">
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  authApi,
  resetPasswordSchema,
  ResetPasswordData,
} from "../../../features/auth/api/auth.api";
import { useAuthStore } from "../../../features/auth/store/auth-store";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const defaultIdentifier =
    searchParams.get("identifier") || searchParams.get("email") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      identifier: defaultIdentifier,
    },
  });

  const router = useRouter();
  const { setUser } = useAuthStore();

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      // Limpiamos el estado del usuario local por si estaba "conectado" con la antigua clave
      setUser(null);
      // Redirigir al login tras cambiar la contraseña exitosamente
      router.push("/login?reset=success");
    },
  });

  const onSubmit = (data: ResetPasswordData) => {
    mutation.mutate(data);
  };

  return (
    <div className="bg-white p-8 rounded shadow-md w-96 text-gray-900">
      <h2 className="text-2xl font-bold mb-2">Nueva Contraseña</h2>
      <p className="text-sm text-gray-600 mb-6">
        Ingresa el código que enviamos a tu correo y tu nueva contraseña.
      </p>

      {mutation.isError && (
        <div className="bg-red-100 text-red-600 p-2 mb-4 rounded text-sm">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Código inválido o expirado."}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Correo electrónico o Usuario
          </label>
          <input
            {...register("identifier")}
            className="w-full border rounded p-2 text-black bg-gray-50"
            placeholder="tu@correo.com o usuario"
          />
          {errors.identifier && (
            <span className="text-red-500 text-xs">
              {errors.identifier.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Código de 6 dígitos
          </label>
          <input
            {...register("otp")}
            className="w-full border rounded p-2 text-black tracking-widest text-center text-lg"
            placeholder="000000"
            maxLength={6}
          />
          {errors.otp && (
            <span className="text-red-500 text-xs">{errors.otp.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nueva Contraseña
          </label>
          <input
            type="password"
            {...register("newPassword")}
            className="w-full border rounded p-2 text-black"
          />
          {errors.newPassword && (
            <span className="text-red-500 text-xs">
              {errors.newPassword.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Confirmar Contraseña
          </label>
          <input
            type="password"
            {...register("confirmPassword")}
            className="w-full border rounded p-2 text-black"
          />
          {errors.confirmPassword && (
            <span className="text-red-500 text-xs">
              {errors.confirmPassword.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-4"
        >
          {mutation.isPending ? "Guardando..." : "Cambiar Contraseña"}
        </button>
      </form>

      <div className="mt-6 text-sm text-center border-t pt-4">
        <Link href="/login" className="text-blue-600 hover:underline">
          Cancelar
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Suspense fallback={<div className="text-black">Cargando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

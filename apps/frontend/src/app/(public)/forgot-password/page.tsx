"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authApi, forgotPasswordSchema, ForgotPasswordData } from "../../../features/auth/api/auth.api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (_, variables) => {
      setSuccess(true);
      // Opcional: Redirigir automáticamente a reset-password con el correo prellenado en query params
      // Si fue usuario, no sabremos el correo exacto en el frontend, pero lo pasaremos igual al input
      setTimeout(() => {
        router.push(`/reset-password?identifier=${encodeURIComponent(variables.identifier)}`);
      }, 3000);
    },
  });

  const onSubmit = (data: ForgotPasswordData) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96 text-gray-900">
        <h2 className="text-2xl font-bold mb-2">Recuperar Contraseña</h2>
        <p className="text-sm text-gray-600 mb-6">
          Ingresa tu correo electrónico o nombre de usuario y te enviaremos un código de 6 dígitos.
        </p>
        
        {success && (
          <div className="bg-green-100 text-green-700 p-3 mb-4 rounded text-sm text-center">
            Código enviado correctamente.<br/>Redirigiendo...
          </div>
        )}

        {mutation.isError && (
          <div className="bg-red-100 text-red-600 p-2 mb-4 rounded text-sm">
            Error de conexión. Intenta de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Correo electrónico o Usuario</label>
            <input 
              {...register("identifier")} 
              className="w-full border rounded p-2 text-black"
              placeholder="tu@correo.com o usuario"
              disabled={mutation.isPending || success}
            />
            {errors.identifier && <span className="text-red-500 text-xs">{errors.identifier.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={mutation.isPending || success}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Enviando..." : "Enviar Código"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center border-t pt-4">
          <Link href="/login" className="text-blue-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

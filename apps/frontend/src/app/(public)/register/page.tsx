"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  authApi,
  registerSchema,
  RegisterData,
} from "../../../features/auth/api/auth.api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect } from "react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const inviteTokenParam = searchParams.get("inviteToken");

  const { data: verifyData, isLoading: isVerifying } = useQuery({
    queryKey: ["verifyInvite", inviteTokenParam],
    queryFn: () => authApi.verifyInvite(inviteTokenParam!),
    enabled: !!inviteTokenParam,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const router = useRouter();

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      alert("Registro exitoso. Por favor, inicia sesión.");
      router.push("/login");
    },
  });

  const onSubmit = (data: RegisterData) => {
    mutation.mutate(data);
  };

  useEffect(() => {
    if (inviteTokenParam && verifyData?.isValid) {
      setValue("inviteToken", inviteTokenParam);
    }
  }, [inviteTokenParam, verifyData, setValue]);

  if (!inviteTokenParam) {
    return (
      <div className="bg-white p-8 rounded shadow-md w-[32rem] text-center text-gray-900">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          Acceso Denegado
        </h2>
        <p className="mb-6">
          No tienes un token de invitación en el enlace. Por favor, solicita a
          un administrador que te genere un enlace de invitación.
        </p>
        <Link href="/login" className="text-blue-600 hover:underline">
          Volver al Login
        </Link>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="bg-white p-8 rounded shadow-md w-[32rem] text-center text-gray-900">
        <h2 className="text-xl font-semibold mb-4">
          Verificando invitación...
        </h2>
        <p className="text-gray-600">Por favor, espera un momento.</p>
      </div>
    );
  }

  if (!verifyData?.isValid) {
    return (
      <div className="bg-white p-8 rounded shadow-md w-[32rem] text-center text-gray-900">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          Enlace Inválido o Expirado
        </h2>
        <p className="mb-6">
          El token de invitación ha caducado o es incorrecto. Por favor,
          solicita un nuevo enlace a un administrador.
        </p>
        <Link href="/login" className="text-blue-600 hover:underline">
          Volver al Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded shadow-md w-[32rem] text-gray-900">
      <h2 className="text-2xl font-bold mb-4">Registro</h2>

      {mutation.isError && (
        <div className="bg-red-100 text-red-600 p-2 mb-4 rounded text-sm">
          Error en el registro. Verifica los datos o el token de invitación.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              {...register("firstName")}
              className="w-full border rounded p-2 text-black"
            />
            {errors.firstName && (
              <span className="text-red-500 text-xs">
                {errors.firstName.message}
              </span>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apellido</label>
            <input
              {...register("lastName")}
              className="w-full border rounded p-2 text-black"
            />
            {errors.lastName && (
              <span className="text-red-500 text-xs">
                {errors.lastName.message}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Usuario</label>
          <input
            {...register("username")}
            className="w-full border rounded p-2 text-black"
          />
          {errors.username && (
            <span className="text-red-500 text-xs">
              {errors.username.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...register("email")}
            className="w-full border rounded p-2 text-black"
          />
          {errors.email && (
            <span className="text-red-500 text-xs">{errors.email.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            {...register("password")}
            className="w-full border rounded p-2 text-black"
          />
          {errors.password && (
            <span className="text-red-500 text-xs">
              {errors.password.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Token de Invitación
          </label>
          <input
            {...register("inviteToken")}
            className="w-full border rounded p-2 text-black"
          />
          {errors.inviteToken && (
            <span className="text-red-500 text-xs">
              {errors.inviteToken.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Registrando..." : "Registrar"}
        </button>
      </form>

      <div className="mt-4 text-sm text-center">
        <Link href="/login" className="text-blue-600 hover:underline">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Suspense
        fallback={
          <div className="text-gray-900 bg-white p-8 rounded shadow-md">
            Verificando invitación...
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}

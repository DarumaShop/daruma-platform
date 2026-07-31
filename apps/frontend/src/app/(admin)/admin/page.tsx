"use client";

import { useState } from "react";
import { useAuthStore } from "../../../features/auth/store/auth-store";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../../features/auth/api/auth.api";

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [inviteLink, setInviteLink] = useState("");

  const inviteMutation = useMutation({
    mutationFn: authApi.generateInvite,
    onSuccess: (data) => {
      setInviteLink(`${window.location.origin}/register?inviteToken=${data.inviteToken}`);
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Dashboard</h1>
      <div className="bg-white p-6 rounded shadow text-gray-900">
        <p className="text-lg">
          Bienvenido al panel de administración, <strong>{user?.email}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-2">Rol: {user?.role}</p>

        <div className="mt-8">
          <p>
            Esta es una interfaz simplificada para probar el flujo de
            autenticación.
          </p>
          <p>
            El token de acceso expirará en 15 minutos, momento en el cual el{" "}
            <code>apiClient</code> usará el Refresh Token para obtener uno nuevo
            automáticamente de forma invisible.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-2">
            Invitar a un nuevo Administrador
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Genera un enlace temporal válido por 12 horas para que otra persona
            pueda registrarse.
          </p>
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {inviteMutation.isPending
              ? "Generando..."
              : "Generar Enlace de Invitación"}
          </button>

          {inviteMutation.isError && (
            <div className="mt-3 text-red-600 text-sm">
              Error al generar el enlace. Verifica tus permisos.
            </div>
          )}

          {inviteLink && (
            <div className="mt-4 p-4 bg-gray-50 border rounded-md">
              <p className="text-sm font-medium mb-1">
                Copia y envía este enlace:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="w-full bg-white border p-2 text-sm rounded cursor-text"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

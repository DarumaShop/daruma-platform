import { apiClient } from "../../../shared/lib/api-client";
import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email o usuario requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.email("Email inválido"),
  username: z.string().min(3, "Mínimo 3 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  inviteToken: z.string().min(1, "Token de invitación requerido"),
});

export type RegisterData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "El usuario o correo es requerido"),
});
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  identifier: z.string().min(1, "El usuario o correo es requerido"),
  otp: z.string().length(6, "El código debe tener 6 dígitos"),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const authApi = {
  login: async (data: LoginData) => {
    const res = await apiClient.post("/auth/login", data);
    return res.data as { user: { email: string; role: string } };
  },
  register: async (data: RegisterData) => {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post("/auth/logout");
    return res.data;
  },
  generateInvite: async () => {
    const res = await apiClient.get("/auth/invite");
    return res.data as { inviteToken: string };
  },
  verifyInvite: async (token: string) => {
    const res = await apiClient.get(`/auth/verify-invite/${token}`);
    return res.data as { isValid: boolean };
  },
  forgotPassword: async (data: ForgotPasswordData) => {
    const res = await apiClient.post("/auth/forgot-password", data);
    return res.data;
  },
  resetPassword: async (data: ResetPasswordData) => {
    const payload = { 
      identifier: data.identifier, 
      otp: data.otp, 
      newPassword: data.newPassword 
    };
    const res = await apiClient.post("/auth/reset-password", payload);
    return res.data;
  },
};

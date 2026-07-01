import { AuthResponse, LoginPayload, RegisterPayload } from "@/lib/auth";
import { apiFetch } from "./client";

export interface MessageResponse {
  message: string;
}

export function loginApi(
  payload: LoginPayload,
) {
  return apiFetch<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  ); 
}

export async function registerApi(
  payload: RegisterPayload,
) {
  return apiFetch<MessageResponse>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

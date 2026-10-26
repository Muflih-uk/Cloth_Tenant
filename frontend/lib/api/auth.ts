import { LoginRequest, LoginResponse, UserProfile } from "@/types/auth";
import { api } from "./axios";

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>("/api/auth/login/", data);

    return res.data;
  },

  async getProfile(): Promise<UserProfile> {
    const res = await api.get<UserProfile>("/api/auth/profile/");
    return res.data;
  },

  /** Edit your own account details (name, username, email). */
  async updateProfile(data: {
    username?: string;
    email?: string;
    display_name?: string;
  }): Promise<UserProfile> {
    const res = await api.patch<UserProfile>("/api/auth/profile/", data);
    return res.data;
  },

  forgotPassword: async (data: { email: string }) => {
    const res = await api.post("/api/auth/forgot-password/", data);
    return res.data;
  },

  /** Set the first PIN on an account that has none. */
  createPin(pin: string): Promise<{ message: string; has_pin: boolean }> {
    return api
      .post<{ message: string; has_pin: boolean }>("/api/auth/create-pin/", {
        pin,
      })
      .then((r) => r.data);
  },

  /** Ask for the one-time code that lets an existing PIN be changed. */
  requestPinCode(): Promise<{ message: string; expires_in_minutes: number }> {
    return api
      .post<{ message: string; expires_in_minutes: number }>(
        "/api/auth/request-pin-code/",
      )
      .then((r) => r.data);
  },

  /** Trade the emailed code for a new PIN. */
  resetPin(
    code: string,
    pin: string,
  ): Promise<{ message: string; has_pin: boolean }> {
    return api
      .post<{ message: string; has_pin: boolean }>("/api/auth/reset-pin/", {
        code,
        pin,
      })
      .then((r) => r.data);
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const res = await api.post("/api/auth/reset-password/", data);
    return res.data;
  },

  logout() {},
};

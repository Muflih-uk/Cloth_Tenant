export type Role = "ADMIN" | "AGENT";
export type Business = "gents" | "kids";

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  role: Role;
  user_id: number;
  username?: string;
  email?: string;
  business?: Business | null;
  is_superuser: boolean;
}

export interface AuthUser {
  id: number;
  role: Role;
  username?: string;
  email?: string;
  display_name?: string;
  business?: Business | null;
  is_superuser: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  role: Role;
  business?: Business | null;
  is_superuser: boolean;
  /** Whether this account already has a PIN: with none, one can simply be
   *  created; an existing one only changes through the emailed code. */
  has_pin?: boolean;
}

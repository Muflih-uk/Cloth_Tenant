import type { Business, PermissionFlags } from "@/types/auth";

export interface Admin {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  business?: Business | null;
  brand_id?: number | null;
}

export interface AdminRequest {
  pin: string;
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface AdminUpdateRequest {
  pin?: string;
  username?: string;
  email?: string;
  password?: string;
  display_name?: string;
  business?: Business | null;
  brand_id?: number | null;
}

export type AdminAllResponse = Admin[];
export type AdminResponse = Admin;

export interface SubAdmin extends PermissionFlags {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  role: "SUBADMIN";
  is_active: boolean;
  has_pin: boolean;
}

export interface SubAdminRequest extends PermissionFlags {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  pin?: string;
}

export type SubAdminUpdateRequest = Partial<
  Omit<SubAdminRequest, "password"> & {
    password: string;
    is_active: boolean;
  }
>;

export type SubAdminAllResponse = SubAdmin[];
export type SubAdminResponse = SubAdmin;

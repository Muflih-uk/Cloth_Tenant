export type Role = "ADMIN" | "SUBADMIN" | "AGENT";
export type Business = "gents" | "kids";

export interface PermissionFlags {
  orders_view: boolean;
  orders_edit: boolean;
  orders_delete: boolean;
  items_view: boolean;
  items_edit: boolean;
  items_delete: boolean;
  agents_view: boolean;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse extends PermissionFlags {
  access: string;
  refresh: string;
  role: Role;
  user_id: number;
  username?: string;
  email?: string;
  business?: Business | null;
  is_superuser: boolean;
}

export interface AuthUser extends PermissionFlags {
  id: number;
  role: Role;
  username?: string;
  email?: string;
  display_name?: string;
  business?: Business | null;
  is_superuser: boolean;
}

export interface UserProfile extends PermissionFlags {
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

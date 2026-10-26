import type {
  AdminAllResponse,
  AdminResponse,
  AdminRequest,
  AdminUpdateRequest,
  SubAdminAllResponse,
  SubAdminRequest,
  SubAdminResponse,
  SubAdminUpdateRequest,
} from "@/types/admin";
import { api } from "./axios";

export const adminApi = {
  getAll(): Promise<AdminAllResponse> {
    return api.get<AdminAllResponse>("/api/admins/").then((r) => r.data);
  },

  getOne(id: number): Promise<AdminResponse> {
    return api.get<AdminResponse>(`/api/admins/${id}/`).then((r) => r.data);
  },

  create(data: AdminRequest): Promise<AdminResponse> {
    return api.post<AdminResponse>("/api/admins/", data).then((r) => r.data);
  },

  update(id: number, data: AdminUpdateRequest): Promise<AdminResponse> {
    return api
      .patch<AdminResponse>(`/api/admins/${id}/`, data)
      .then((r) => r.data);
  },

  delete(id: number): Promise<void> {
    return api.delete(`/api/admins/${id}/`).then((r) => r.data);
  },
};

export const subAdminApi = {
  getAll(): Promise<SubAdminAllResponse> {
    return api
      .get<SubAdminAllResponse>("/api/admins/subadmins/")
      .then((r) => r.data);
  },

  getOne(id: number): Promise<SubAdminResponse> {
    return api
      .get<SubAdminResponse>(`/api/admins/subadmins/${id}/`)
      .then((r) => r.data);
  },

  create(data: SubAdminRequest): Promise<SubAdminResponse> {
    return api
      .post<SubAdminResponse>("/api/admins/subadmins/", data)
      .then((r) => r.data);
  },

  update(
    id: number,
    data: SubAdminUpdateRequest,
  ): Promise<SubAdminResponse> {
    return api
      .patch<SubAdminResponse>(`/api/admins/subadmins/${id}/`, data)
      .then((r) => r.data);
  },

  deactivate(id: number): Promise<void> {
    return api.delete(`/api/admins/subadmins/${id}/`).then((r) => r.data);
  },
};

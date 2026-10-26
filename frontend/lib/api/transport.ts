import { api } from "./axios";
import {
  TransportAllResponse,
  TransportCreateRequest,
  TransportUpdateRequest,
} from "@/types/transport";

export const transportApi = {
  getAll: async () => {
    const response = await api.get<TransportAllResponse>("/api/transports/");
    return response.data;
  },

  getActive: async () => {
    const response = await api.get<TransportAllResponse>(
      "/api/transports/active/",
    );
    return response.data;
  },

  create: async (data: TransportCreateRequest, pin?: string) => {
    const response = await api.post<TransportAllResponse>(
      "/api/transports/",
      // A non-superuser admin has to name their PIN, the same as every other
      // admin write; superusers are exempt server-side.
      pin ? { ...data, pin } : data,
    );
    return response.data;
  },

  update: async (id: number, data: TransportUpdateRequest, pin?: string) => {
    const response = await api.patch<TransportAllResponse>(
      `/api/transports/${id}/`,
      pin ? { ...data, pin } : data,
    );
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/transports/${id}/`);
  },
};

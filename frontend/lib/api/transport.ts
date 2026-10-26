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

  create: async (data: TransportCreateRequest, pin: string) => {
    const response = await api.post<TransportAllResponse>("/api/transports/", {
      ...data,
      pin,
    });
    return response.data;
  },

  update: async (id: number, data: TransportUpdateRequest, pin: string) => {
    const response = await api.patch<TransportAllResponse>(
      `/api/transports/${id}/`,
      { ...data, pin },
    );
    return response.data;
  },

  delete: async (id: number, pin: string) => {
    await api.delete(`/api/transports/${id}/`, { data: { pin } });
  },
};

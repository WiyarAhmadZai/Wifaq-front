// Bugs & Errors module API.
import api from "./axios";

export const bugsApi = {
  list: (params = {}) => api.get("/bugs", { params }),
  // `payload` is FormData when screenshots are attached.
  create: (payload) => {
    const isForm = payload instanceof FormData;
    return api.post("/bugs", payload, {
      headers: isForm ? { "Content-Type": "multipart/form-data" } : undefined,
    });
  },
  show: (id) => api.get(`/bugs/${id}`),
  updateStatus: (id, data) => api.put(`/bugs/${id}/status`, data),
  remove: (id) => api.delete(`/bugs/${id}`),
};

export default bugsApi;

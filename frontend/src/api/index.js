import { api } from "./client";

export const authApi = {
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password } }),
  register: (email, password, full_name) =>
    api("/auth/register", { method: "POST", body: { email, password, full_name } }),
  me: () => api("/auth/me"),
};

export const projectsApi = {
  list: () => api("/projects"),
  create: (payload) => api("/projects", { method: "POST", body: payload }),
};

export const itemsApi = {
  list: (projectId) => api(`/projects/${projectId}/items`),
  create: (projectId, payload) =>
    api(`/projects/${projectId}/items`, { method: "POST", body: payload }),
  versions: (projectId, itemId) => api(`/projects/${projectId}/items/${itemId}/versions`),
  addVersion: (projectId, itemId, payload) =>
    api(`/projects/${projectId}/items/${itemId}/versions`, { method: "POST", body: payload }),
  comments: (projectId, itemId) => api(`/projects/${projectId}/items/${itemId}/comments`),
  addComment: (projectId, itemId, body) =>
    api(`/projects/${projectId}/items/${itemId}/comments`, { method: "POST", body }),
  generateDraft: (projectId, itemId) =>
    api(`/projects/${projectId}/items/${itemId}/draft`, { method: "POST" }),
  review: (projectId, itemId, action) =>
    api(`/projects/${projectId}/items/${itemId}/review`, { method: "POST", body: { action } }),
  exportItem: async (projectId, itemId) => {
    const res = await api(`/projects/${projectId}/items/${itemId}/export`, { raw: true });
    return res.blob();
  },
};

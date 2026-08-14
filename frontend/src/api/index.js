import { api } from "./client";

export const authApi = {
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password } }),
  register: (email, password, full_name) =>
    api("/auth/register", { method: "POST", body: { email, password, full_name } }),
  me: () => api("/auth/me"),
};

export const projectsApi = {
  list: () => api("/projects"),
  get: (projectId) => api(`/projects/${projectId}`),
  create: (payload) => api("/projects", { method: "POST", body: payload }),
};

export const workspacesApi = {
  list: () => api("/workspaces"),
  get: (workspaceId) => api(`/workspaces/${workspaceId}`),
  create: (name) => api("/workspaces", { method: "POST", body: { name } }),
  update: (workspaceId, name) =>
    api(`/workspaces/${workspaceId}`, { method: "PATCH", body: { name } }),
  remove: (workspaceId) => api(`/workspaces/${workspaceId}`, { method: "DELETE" }),
  members: (workspaceId) => api(`/workspaces/${workspaceId}/members`),
  updateMember: (workspaceId, userId, role) =>
    api(`/workspaces/${workspaceId}/members/${userId}`, { method: "PATCH", body: { role } }),
  removeMember: (workspaceId, userId) =>
    api(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" }),
  transfer: (workspaceId, userId) =>
    api(`/workspaces/${workspaceId}/transfer`, { method: "POST", body: { user_id: userId } }),
  createInvite: (workspaceId, email, role) =>
    api(`/workspaces/${workspaceId}/invites`, { method: "POST", body: { email, role } }),
  listInvites: (workspaceId) => api(`/workspaces/${workspaceId}/invites`),
  revokeInvite: (workspaceId, token) =>
    api(`/workspaces/${workspaceId}/invites/${token}`, { method: "DELETE" }),
};

export const invitesApi = {
  info: (token) => api(`/invites/${token}`),
  accept: (token) => api("/invites/accept", { method: "POST", body: { token } }),
  register: (token, email, password, full_name) =>
    api(`/invites/${token}/register`, { method: "POST", body: { email, password, full_name } }),
};

export const itemsApi = {
  list: (projectId) => api(`/projects/${projectId}/items`),
  get: (projectId, itemId) => api(`/projects/${projectId}/items/${itemId}`),
  create: (projectId, payload) =>
    api(`/projects/${projectId}/items`, { method: "POST", body: payload }),
  update: (projectId, itemId, payload) =>
    api(`/projects/${projectId}/items/${itemId}`, { method: "PATCH", body: payload }),
  versions: (projectId, itemId) => api(`/projects/${projectId}/items/${itemId}/versions`),
  deleteVersion: (projectId, itemId, versionId) =>
    api(`/projects/${projectId}/items/${itemId}/versions/${versionId}`, { method: "DELETE" }),
  diffVersions: (projectId, itemId, fromVersion, toVersion) =>
    api(
      `/projects/${projectId}/items/${itemId}/versions/diff?from_version=${fromVersion}&to_version=${toVersion}`,
    ),
  addVersion: (projectId, itemId, payload) =>
    api(`/projects/${projectId}/items/${itemId}/versions`, { method: "POST", body: payload }),
  comments: (projectId, itemId) => api(`/projects/${projectId}/items/${itemId}/comments`),
  addComment: (projectId, itemId, body) =>
    api(`/projects/${projectId}/items/${itemId}/comments`, { method: "POST", body }),
  updateComment: (projectId, itemId, commentId, body) =>
    api(`/projects/${projectId}/items/${itemId}/comments/${commentId}`, { method: "PATCH", body }),
  generateDraft: (projectId, itemId) =>
    api(`/projects/${projectId}/items/${itemId}/draft`, { method: "POST" }),
  styleCheck: (projectId, itemId, body) =>
    api(`/projects/${projectId}/items/${itemId}/style-check`, {
      method: "POST",
      body: { body },
    }),
  translations: (projectId, itemId) =>
    api(`/projects/${projectId}/items/${itemId}/translations`),
  review: (projectId, itemId, action) =>
    api(`/projects/${projectId}/items/${itemId}/review`, { method: "POST", body: { action } }),
  transition: (projectId, itemId, status, note) =>
    api(`/projects/${projectId}/items/${itemId}/transition`, {
      method: "POST",
      body: { status, note },
    }),
  history: (projectId, itemId) => api(`/projects/${projectId}/items/${itemId}/history`),
  exportItem: async (projectId, itemId) => {
    const res = await api(`/projects/${projectId}/items/${itemId}/export`, { raw: true });
    return res.blob();
  },
};

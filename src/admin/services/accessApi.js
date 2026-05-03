import { get, post, put, del } from "../../api/axios";

const BASE = "/access";

export const accessApi = {
  // Current user
  me: () => get(`${BASE}/me`),

  // Roles
  listRoles: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`${BASE}/roles${q ? `?${q}` : ""}`);
  },
  showRole: (id) => get(`${BASE}/roles/${id}`),
  createRole: (data) => post(`${BASE}/roles`, data),
  updateRole: (id, data) => put(`${BASE}/roles/${id}`, data),
  deleteRole: (id) => del(`${BASE}/roles/${id}`),
  syncRolePermissions: (id, permissions) =>
    put(`${BASE}/roles/${id}/permissions`, { permissions }),

  // Permissions
  listPermissions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`${BASE}/permissions${q ? `?${q}` : ""}`);
  },
  createPermission: (data) => post(`${BASE}/permissions`, data),
  updatePermission: (id, data) => put(`${BASE}/permissions/${id}`, data),
  deletePermission: (id) => del(`${BASE}/permissions/${id}`),

  // Users
  listUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`${BASE}/users${q ? `?${q}` : ""}`);
  },
  showUser: (id) => get(`${BASE}/users/${id}`),
  createUser: (data) => post(`${BASE}/users`, data),
  updateUser: (id, data) => put(`${BASE}/users/${id}`, data),
  deleteUser: (id) => del(`${BASE}/users/${id}`),
  syncUserRoles: (id, payload) => put(`${BASE}/users/${id}/roles`, payload),
};

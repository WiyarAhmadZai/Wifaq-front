import { get, post, put, del } from "../../api/axios";

const BASE = "/access";

/**
 * `cache: false` on every access-control READ.
 *
 * The shared axios layer keeps GET responses in localStorage across reloads,
 * and drops them only when a mutation goes through the same resource path.
 * Roles and permissions do not always change that way — a migration adds them
 * straight to the database, and the client never hears about it. The stale copy
 * then outlives the change: a permission that exists is missing from the
 * picker, so nobody can grant it, and /access/me can report a permission set
 * the user no longer has.
 *
 * Authorization data is the one thing in the app that must always be current,
 * and these payloads are small. Nothing here is worth caching.
 */
const FRESH = { cache: false };

export const accessApi = {
  // Current user
  me: () => get(`${BASE}/me`, FRESH),

  // Roles
  listRoles: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`${BASE}/roles${q ? `?${q}` : ""}`, FRESH);
  },
  showRole: (id) => get(`${BASE}/roles/${id}`, FRESH),
  createRole: (data) => post(`${BASE}/roles`, data),
  updateRole: (id, data) => put(`${BASE}/roles/${id}`, data),
  deleteRole: (id) => del(`${BASE}/roles/${id}`),
  syncRolePermissions: (id, permissions) =>
    put(`${BASE}/roles/${id}/permissions`, { permissions }),

  // Permissions
  listPermissions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`${BASE}/permissions${q ? `?${q}` : ""}`, FRESH);
  },
  createPermission: (data) => post(`${BASE}/permissions`, data),
  updatePermission: (id, data) => put(`${BASE}/permissions/${id}`, data),
  deletePermission: (id) => del(`${BASE}/permissions/${id}`),

  // Users
  listUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`${BASE}/users${q ? `?${q}` : ""}`, FRESH);
  },
  showUser: (id) => get(`${BASE}/users/${id}`, FRESH),
  createUser: (data) => post(`${BASE}/users`, data),
  updateUser: (id, data) => put(`${BASE}/users/${id}`, data),
  deleteUser: (id) => del(`${BASE}/users/${id}`),
  syncUserRoles: (id, payload) => put(`${BASE}/users/${id}/roles`, payload),
};

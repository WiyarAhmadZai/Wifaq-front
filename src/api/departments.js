import { get, post, put, del } from "./axios";

const BASE = "/hr/departments";

export const listDepartments   = (params = {}) => get(`${BASE}/list`, { params });
export const getDepartment     = (id)          => get(`${BASE}/show/${id}`);
export const createDepartment  = (data)        => post(`${BASE}/store`, data);
export const updateDepartment  = (id, data)    => put(`${BASE}/update/${id}`, data);
export const deleteDepartment  = (id)          => del(`${BASE}/delete/${id}`);

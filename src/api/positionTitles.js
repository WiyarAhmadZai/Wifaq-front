import { get, post, put, del } from "./axios";

const BASE = "/recruitment/position-titles";

export const listPositionTitles  = (params = {}) => get(`${BASE}/list`, { params });
export const getPositionTitle    = (id)          => get(`${BASE}/show/${id}`);
export const createPositionTitle = (data)        => post(`${BASE}/store`, data);
export const updatePositionTitle = (id, data)    => put(`${BASE}/update/${id}`, data);
export const deletePositionTitle = (id)          => del(`${BASE}/delete/${id}`);

/** The groups the staff list nests people under — mirrors PositionTitle::CATEGORIES. */
export const STAFF_GROUPS = [
  { key: "leadership", label: "Leadership / Management" },
  { key: "teachers", label: "Teachers" },
  { key: "admin", label: "Admin Staff" },
  { key: "service", label: "Service Staff" },
  { key: "media", label: "Media Dept" },
  { key: "digital", label: "Digital" },
];

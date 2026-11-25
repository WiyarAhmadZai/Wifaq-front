import { del, get, post, put } from "./axios";

const BASE = "/surah-memorization";

export const surahMemorizationSetup = () => get(`${BASE}/setup`);
export const surahMemorizationClass = (classId, params) => get(`${BASE}/classes/${classId}`, { params });
export const saveSurahMemorizationClass = (classId, data) => put(`${BASE}/classes/${classId}/progress`, data);
export const createMemorizationItem = (data) => post(`${BASE}/items`, data);
export const updateMemorizationItem = (id, data) => put(`${BASE}/items/${id}`, data);
export const deleteMemorizationItem = (id) => del(`${BASE}/items/${id}`);

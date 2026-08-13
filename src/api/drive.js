import api, { get, post, del, put } from "./axios";

// Drive — private per-user file manager (nested folders + uploads + links),
// plus the shared institutional catalogue defined by the Drive Module spec v3.
const BASE = "/drive";

// ── Catalogue ───────────────────────────────────────────────────────────────
// The vocabulary lives on the server (App\Support\DriveTaxonomy) so the filter
// bar, the upload form and the API validation can never disagree.
export const getTaxonomy = () => get(`${BASE}/taxonomy`);

export const listCatalogue = (filters = {}) => {
  // Blank values would otherwise become "?category=" and fail the enum rule.
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v != null),
  );
  return get(`${BASE}/catalogue`, { params });
};

export const saveCatalogue = (id, fields) => put(`${BASE}/files/${id}/catalogue`, fields);

// ── Move / copy ─────────────────────────────────────────────────────────────
// A null destination means the Home (root) level, which is a valid target.
export const moveFile   = (id, folderId) => put(`${BASE}/files/${id}/move`, { folder_id: folderId || null });
export const moveFolder = (id, parentId) => put(`${BASE}/folders/${id}/move`, { parent_id: parentId || null });
export const copyFileTo   = (id, folderId) => post(`${BASE}/files/${id}/copy`, { folder_id: folderId || null });
export const copyFolderTo = (id, parentId) => post(`${BASE}/folders/${id}/copy`, { parent_id: parentId || null });

export const listDrive    = (folderId) => get(BASE, { params: folderId ? { folder_id: folderId } : {} });
export const createFolder = (name, parentId) => post(`${BASE}/folders`, { name, parent_id: parentId || null });
export const addLink      = (folderId, name, url, mediaType, catalogue = {}) =>
  post(`${BASE}/links`, {
    folder_id: folderId || null, name, external_url: url,
    media_type: mediaType || "file", ...catalogue,
  });
export const deleteFile   = (id) => del(`${BASE}/files/${id}`);
export const deleteFolder = (id) => del(`${BASE}/folders/${id}`);

export const uploadFiles = (folderId, fileList, catalogue = {}) => {
  const fd = new FormData();
  if (folderId) fd.append("folder_id", folderId);
  Array.from(fileList).forEach((f) => fd.append("files[]", f));
  // Empty strings are dropped: multipart sends everything as text, and "" would
  // fail the server's enum rules instead of reading as "not set".
  Object.entries(catalogue).forEach(([k, v]) => {
    if (v !== "" && v != null) fd.append(k, v);
  });
  // The axios instance defaults to Content-Type: application/json, which makes
  // axios JSON-stringify a FormData body (dropping the files). Setting it to
  // multipart/form-data keeps the FormData intact; axios then blanks the header
  // in resolveConfig so the BROWSER adds the real "; boundary=…". Do not remove.
  // timeout:0 disables the 15s default so larger files aren't cut off mid-upload.
  return post(`${BASE}/files`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
  });
};

// Private files are streamed through an authenticated route, so they must be
// fetched as blobs (a plain <img src>/window.open would not carry the token).
export const fileRawBlob      = (id) => api.get(`${BASE}/files/${id}/raw`, { responseType: "blob" });
export const fileDownloadBlob = (id) => api.get(`${BASE}/files/${id}/download`, { responseType: "blob" });

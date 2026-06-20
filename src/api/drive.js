import api, { get, post, del } from "./axios";

// Drive — private per-user file manager (nested folders + uploads + links).
const BASE = "/drive";

export const listDrive    = (folderId) => get(BASE, { params: folderId ? { folder_id: folderId } : {} });
export const createFolder = (name, parentId) => post(`${BASE}/folders`, { name, parent_id: parentId || null });
export const addLink      = (folderId, name, url, mediaType) =>
  post(`${BASE}/links`, { folder_id: folderId || null, name, external_url: url, media_type: mediaType || "file" });
export const deleteFile   = (id) => del(`${BASE}/files/${id}`);
export const deleteFolder = (id) => del(`${BASE}/folders/${id}`);

export const uploadFiles = (folderId, fileList) => {
  const fd = new FormData();
  if (folderId) fd.append("folder_id", folderId);
  Array.from(fileList).forEach((f) => fd.append("files[]", f));
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

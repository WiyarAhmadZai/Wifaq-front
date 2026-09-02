import api, { get, post, del, put } from "./axios";

// Drive — private per-user file manager (nested folders + uploads + links),
// plus the shared institutional catalogue defined by the Drive Module spec v3.
const BASE = "/drive";

// ── Catalogue ───────────────────────────────────────────────────────────────
// The vocabulary lives on the server (App\Support\DriveTaxonomy) so the filter
// bar, the upload form and the API validation can never disagree.
export const getTaxonomy = () => get(`${BASE}/taxonomy`);

// ── Audience ────────────────────────────────────────────────────────────────
// Who the signed-in user may publish to. Served by the server rather than
// derived here: a teacher is offered only the classes they actually teach, and
// the same rule rejects anything else on save.
export const getAudienceOptions = () => get(`${BASE}/audience-options`, { cache: false });

/**
 * Flatten an audience selection into the fields every write endpoint accepts.
 *
 * `visibility` is always sent — its absence is what tells the server to
 * inherit the parent folder's audience, which is only what we want when the
 * caller genuinely did not choose.
 */
export const audienceFields = (audience) => {
  if (!audience || !audience.visibility) return {};
  const out = { visibility: audience.visibility };
  if (audience.visibility === "shared") {
    out.share_class_ids = audience.classes || [];
    out.share_department_ids = audience.departments || [];
    out.share_user_ids = audience.users || [];
  }
  return out;
};

export const listCatalogue = (filters = {}) => {
  // Blank values would otherwise become "?category=" and fail the enum rule.
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v != null),
  );
  return get(`${BASE}/catalogue`, { params });
};

export const saveCatalogue = (id, fields, audience) =>
  put(`${BASE}/files/${id}/catalogue`, { ...fields, ...audienceFields(audience) });

// ── Move / copy ─────────────────────────────────────────────────────────────
// A null destination means the Home (root) level, which is a valid target.
export const moveFile   = (id, folderId) => put(`${BASE}/files/${id}/move`, { folder_id: folderId || null });
export const moveFolder = (id, parentId) => put(`${BASE}/folders/${id}/move`, { parent_id: parentId || null });
export const copyFileTo   = (id, folderId) => post(`${BASE}/files/${id}/copy`, { folder_id: folderId || null });
export const copyFolderTo = (id, parentId) => post(`${BASE}/folders/${id}/copy`, { parent_id: parentId || null });

export const listDrive    = (folderId) => get(BASE, { params: folderId ? { folder_id: folderId } : {} });
export const createFolder = (name, parentId, audience) =>
  post(`${BASE}/folders`, { name, parent_id: parentId || null, ...audienceFields(audience) });
export const addLink      = (folderId, name, url, mediaType, catalogue = {}, audience) =>
  post(`${BASE}/links`, {
    folder_id: folderId || null, name, external_url: url,
    media_type: mediaType || "file", ...catalogue, ...audienceFields(audience),
  });
export const deleteFile   = (id) => del(`${BASE}/files/${id}`);
export const deleteFolder = (id) => del(`${BASE}/folders/${id}`);

export const uploadFiles = (folderId, fileList, catalogue = {}, audience) => {
  const fd = new FormData();
  if (folderId) fd.append("folder_id", folderId);
  Array.from(fileList).forEach((f) => fd.append("files[]", f));
  // Empty strings are dropped: multipart sends everything as text, and "" would
  // fail the server's enum rules instead of reading as "not set".
  Object.entries(catalogue).forEach(([k, v]) => {
    if (v !== "" && v != null) fd.append(k, v);
  });
  // Audience: arrays go as repeated `field[]` entries, which is the only shape
  // multipart can express. An empty selection sends nothing, and the server
  // then stores the item as private rather than as a share nobody is in.
  Object.entries(audienceFields(audience)).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => fd.append(`${k}[]`, x));
    else if (v !== "" && v != null) fd.append(k, v);
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

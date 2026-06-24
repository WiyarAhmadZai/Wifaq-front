import { get, post, put, del } from "./axios";

const BASE = "/questionnaires";

export const listQuestionnaires   = (params = {}) => get(BASE, { params });
export const getQuestionnaire     = (id)          => get(`${BASE}/${id}`);
export const createQuestionnaire  = (data)        => post(BASE, data);
export const updateQuestionnaire  = (id, data)    => put(`${BASE}/${id}`, data);
export const deleteQuestionnaire  = (id)          => del(`${BASE}/${id}`);
export const publishQuestionnaire = (id)          => post(`${BASE}/${id}/publish`, {});
export const closeQuestionnaire   = (id)          => post(`${BASE}/${id}/close`, {});
export const getResponses         = (id)          => get(`${BASE}/${id}/responses`);
export const getStats             = (id)          => get(`${BASE}/${id}/stats`);
export const getCompletion        = ()            => get(`${BASE}/completion`);

// Parent's own questionnaire (logged-in family account).
export const getMyQuestionnaire     = ()           => get("/my-questionnaire");
export const respondMyQuestionnaire = (id, data)   => post(`/my-questionnaire/${id}/respond`, data);

// Upload a file/image answer (public endpoint, works for both public + parent).
export const uploadAnswerFile = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  // Keep Content-Type as multipart so axios doesn't JSON-encode the FormData.
  return post("/public/questionnaire/upload", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 0 });
};

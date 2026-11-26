import { post } from "./axios";

/**
 * Attach evidence files (screenshots, documents) to a staff task.
 * Optional by design — callers only send when the user picked files.
 * Resolves to the task's full evidence list.
 */
export async function uploadTaskEvidence(taskId, files) {
  if (!files?.length) return null;
  const body = new FormData();
  files.forEach((f) => body.append("files[]", f));
  const r = await post(`/hr/staff-tasks/${taskId}/evidence`, body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data?.data || [];
}

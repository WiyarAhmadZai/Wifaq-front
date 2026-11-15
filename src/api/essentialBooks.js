import { get, post, put, del } from './axios';

const BASE = '/library/essential-books';

/**
 * Flatten a payload into FormData in PHP bracket notation (themes[0]=…), so
 * Laravel reads back the same shape the plain JSON body would have produced.
 * Same approach as api/purchaseRequests.js — kept identical on purpose so
 * there is one way this project sends a file alongside fields.
 */
const toFormData = (obj, fd = new FormData(), prefix = '') => {
  Object.entries(obj).forEach(([key, value]) => {
    const field = prefix ? `${prefix}[${key}]` : key;
    if (value === null || value === undefined || value === '') return;
    if (value instanceof File) {
      fd.append(field, value);
    } else if (Array.isArray(value)) {
      // An emptied list has to be sent as an explicit empty array, or the
      // server sees "absent" and keeps the tags the user just cleared.
      if (value.length === 0) fd.append(`${field}[]`, '');
      else value.forEach((v, i) => toFormData({ [i]: v }, fd, field));
    } else if (typeof value === 'object') {
      toFormData(value, fd, field);
    } else {
      fd.append(field, value);
    }
  });
  return fd;
};

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const getFormData = () => get(`${BASE}/form-data`);
export const listBooks   = (params = {}) => get(`${BASE}/index`, { params });
export const getBook     = (id) => get(`${BASE}/show/${id}`);

/**
 * Create / update. Both go out as multipart whenever a PDF is attached, and as
 * plain JSON otherwise so a routine edit is not paying for an upload envelope.
 *
 * The update route is POST, not PUT: PHP does not populate $_FILES for a PUT
 * body, so a PUT carrying a replacement PDF would arrive with every field
 * empty. Laravel's usual answer is _method spoofing — this skips the indirection
 * and just declares the route as POST.
 */
export const createBook = (data) =>
  data?.pdf instanceof File ? post(`${BASE}/store`, toFormData(data), MULTIPART) : post(`${BASE}/store`, data);

export const updateBook = (id, data) =>
  data?.pdf instanceof File
    ? post(`${BASE}/edit/${id}`, toFormData(data), MULTIPART)
    : post(`${BASE}/edit/${id}`, data);

export const setBookStatus = (id, status, reviewNote = null) =>
  put(`${BASE}/status/${id}`, { status, review_note: reviewNote });

export const deleteBook = (id) => del(`${BASE}/delete/${id}`);
export const deleteBookPdf = (id) => del(`${BASE}/${id}/pdf`);

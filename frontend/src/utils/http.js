const API_BASE = process.env.REACT_APP_API_URL || "";

const buildUrl = (path) => `${API_BASE}${path}`;

export async function apiGet(path, options = {}) {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers: { "Accept": "application/json", ...(options.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function apiGetBlob(path, options = {}) {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers: options.headers,
    credentials: "include",
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.blob();
}

export async function apiPostJson(path, body, options = {}) {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function apiPutJson(path, body, options = {}) {
  const res = await fetch(buildUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function apiDelete(path, options = {}) {
  const res = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: { "Accept": "application/json", ...(options.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function apiPostForm(path, formData, onProgress) {
  // fetch does not support progress natively; keep API but ignore onProgress here
  const res = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

async function errorFromResponse(res) {
  let message = `Request failed with ${res.status}`;
  try {
    const data = await res.json();
    if (data && (data.message || data.error)) message = data.message || data.error;
  } catch {}
  return new Error(message);
}

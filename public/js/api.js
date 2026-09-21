/**
 * api.js — the only file that talks to the network.
 * Every other module calls through `Api.*` instead of using fetch directly.
 */
const Api = (() => {
  // Same-origin by default: the Express server now serves this frontend
  // directly, so "/api" always resolves correctly whether you're on
  // http://localhost:4000 or the deployed URL. Override only if you're
  // intentionally serving the frontend from a different origin than the API.
  const BASE_URL = window.NOCTURNE_API_BASE || "/api";
  const TOKEN_KEY = "nocturne_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, { method = "GET", body, headers = {} } = {}) {
    const token = getToken();
    const finalHeaders = { ...headers };
    let finalBody = body;

    if (body !== undefined) {
      finalHeaders["Content-Type"] = "application/json";
      finalBody = JSON.stringify(body);
    }
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: finalBody,
        credentials: "include",
      });
    } catch (networkErr) {
      const err = new Error(
        "We couldn't reach the Nocturne Studio server. Check your connection and try again."
      );
      err.isNetworkError = true;
      throw err;
    }

    let payload = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!res.ok) {
      const message = (payload && payload.message) || `Request failed (${res.status}).`;
      const err = new Error(message);
      err.status = res.status;
      err.details = payload && payload.details;
      throw err;
    }

    return payload;
  }

  async function uploadFile(path, file) {
    const token = getToken();
    const formData = new FormData();
    formData.append("image", file);

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: "include",
      });
    } catch {
      const err = new Error("Couldn't reach the server to upload that image.");
      err.isNetworkError = true;
      throw err;
    }

    let payload = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!res.ok) {
      const message = (payload && payload.message) || `Upload failed (${res.status}).`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    return payload;
  }

  return {
    getToken,
    setToken,
    get: (path) => request(path, { method: "GET" }),
    post: (path, body) => request(path, { method: "POST", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    del: (path) => request(path, { method: "DELETE" }),

    // Convenience wrappers used across pages
    auth: {
      register: (data) => request("/auth/register", { method: "POST", body: data }),
      login: (data) => request("/auth/login", { method: "POST", body: data }),
      me: () => request("/auth/me"),
      logout: () => request("/auth/logout", { method: "POST" }),
    },
    users: {
      updateMe: (data) => request("/users/me", { method: "PATCH", body: data }),
      uploadAvatar: (file) => uploadFile("/users/avatar", file),
    },
    products: {
      list: (params = {}) => {
        const qs = new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
        ).toString();
        return request(`/products${qs ? `?${qs}` : ""}`);
      },
      getById: (id) => request(`/products/${id}`),
      getBySlug: (slug) => request(`/products/slug/${slug}`),
      listReviews: (id) => request(`/products/${id}/reviews`),
      submitReview: (id, data) => request(`/products/${id}/reviews`, { method: "POST", body: data }),
    },
    orders: {
      create: (data) => request("/orders", { method: "POST", body: data }),
      list: () => request("/orders"),
      getById: (id) => request(`/orders/${id}`),
    },
    seller: {
      listProducts: () => request("/seller/products"),
      createProduct: (data) => request("/seller/products", { method: "POST", body: data }),
      updateProduct: (id, data) => request(`/seller/products/${id}`, { method: "PATCH", body: data }),
      deleteProduct: (id) => request(`/seller/products/${id}`, { method: "DELETE" }),
      listOrders: () => request("/seller/orders"),
      // File uploads use multipart/form-data, not JSON — bypasses the
      // request() helper above, which always JSON-encodes the body.
      uploadImage: (file) => uploadFile("/seller/upload", file),
    },
  };
})();

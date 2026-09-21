import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Wag i-redirect kapag galing mismo sa login request (mali ang password),
    // kasi mare-reload ang page at mawawala yung error message sa login form
    const isLoginRequest = err.config?.url?.includes("/auth/login");

    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("tc_token");
      localStorage.removeItem("tc_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

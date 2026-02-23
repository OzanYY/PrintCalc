import api from "./axios";

export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (userData: { name: string; email: string; password: string }) =>
    api.post("/auth/register", {
      username: userData.name, // вот здесь преобразованиеф
      email: userData.email,
      password: userData.password,
    }),

  logout: () => api.post("/auth/logout"),

  getCurrentUser: () => api.get("/auth/me"),
};

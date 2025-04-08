// 从 localStorage 获取 token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 保存 token 到 localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// 从 localStorage 移除 token
export const removeToken = () => {
  localStorage.removeItem('token');
};

// 检查是否有 token
export const hasToken = () => {
  return !!getToken();
}; 
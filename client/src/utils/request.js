import axios from 'axios';
import { message } from 'antd';
import { useAuthStore } from '../store/auth';

const instance = axios.create({
  baseURL: '/api',
  timeout: 30000
});

instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response && err.response.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (err.response && err.response.data && err.response.data.error) {
      message.error(err.response.data.error);
    } else {
      message.error('网络错误，请稍后重试');
    }
    return Promise.reject(err);
  }
);

export default instance;

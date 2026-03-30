import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'),
    withCredentials: true // Crucial para enviar y recibir HttpOnly cookies
});

// Handle 401 globally but ignore login route
API.interceptors.response.use(
    (res) => res,
    (err) => {
        // Ignorar 401 si viene de la ruta de login para permitir mostrar el error en pantalla
        const isLoginRoute = err.config?.url?.includes('/auth/login');
        if (err.response?.status === 401 && !isLoginRoute) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default API;

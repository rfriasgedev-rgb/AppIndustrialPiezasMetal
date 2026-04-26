import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true
});

export const companyService = {
    // Obtiene el registro único de la empresa
    getCompany: () => api.get('/company').then(res => res.data).catch(err => {
        // 404 = no hay registro aún, retornar null sin lanzar error
        if (err.response?.status === 404) return null;
        throw err;
    }),

    // Crea o actualiza el registro único de la empresa
    upsertCompany: (data) => api.put('/company', data).then(res => res.data),
};

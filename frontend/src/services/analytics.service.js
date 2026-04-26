import API from './client';

export const analyticsService = {
    getOperatorStats: async () => {
        const response = await API.get('/analytics/operator-stats');
        return response.data;
    }
};

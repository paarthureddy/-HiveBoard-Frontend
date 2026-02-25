import api from '../api';

export const analyticsAPI = {
    getSummary: async (roomId: string) => {
        const response = await api.get(`/analytics/summary/${roomId}`);
        return response.data;
    },
    getUserReport: async (roomId: string, userId: string) => {
        const response = await api.get(`/analytics/user/${roomId}/${userId}`);
        return response.data;
    },
    getHistory: async (roomId: string) => {
        const response = await api.get(`/analytics/history/${roomId}`);
        return response.data;
    }
};

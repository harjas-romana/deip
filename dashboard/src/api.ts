import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export async function fetchMetrics(userId: string, days: number = 30) {
  const { data } = await api.get('/metrics', {
    params: { userId, days },
  });
  return data;
}

export async function fetchInsights(userId: string) {
  const { data } = await api.get(`/insights/${userId}`);
  return data;
}

export async function fetchRecentEvents(userId: string) {
  const { data } = await api.get(`/events/${userId}/recent`);
  return data;
}

export async function fetchStreamInfo() {
  const { data } = await api.get('/stream/info');
  return data;
}
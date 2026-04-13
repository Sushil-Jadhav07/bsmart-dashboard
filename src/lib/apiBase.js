const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const rawBase =
  import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL
  || 'https://api.bebsmart.in';

export const API_BASE_URL = trimTrailingSlash(rawBase);
export const API_BASE_WITH_PATH = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;


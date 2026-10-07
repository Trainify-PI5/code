import axios from 'axios';

export function requestError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail !== 'Validation failed') return detail;
  }
  return fallback;
}


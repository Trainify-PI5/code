import axios from 'axios';

export function requestError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.status === 503
      && error.response.data?.code === 'EMAIL_DELIVERY_UNAVAILABLE') {
    return 'O serviço de e-mail está indisponível. A operação não foi concluída. Peça à equipe responsável para verificar a configuração de envio.';
  }
  if (axios.isAxiosError(error) && error.response?.status === 405) {
    return 'Esta operação ainda não está disponível no servidor. Solicite a atualização da plataforma.';
  }
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail !== 'Validation failed') return detail;
  }
  return fallback;
}

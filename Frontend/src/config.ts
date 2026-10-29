// Endereco da API.
//
// Em desenvolvimento (npm run dev) usa o backend local. No site publicado usa a
// API hospedada no Render. Para apontar para outro backend, defina VITE_API_URL
// em um arquivo .env local.
const DEV_API_URL = "http://localhost:8080/api/v1";
const PROD_API_URL = "https://trainify-api-p2ka.onrender.com/api/v1";

const env = import.meta.env as unknown as {
  VITE_API_URL?: string;
  PROD?: boolean;
  VITE_RECAPTCHA_SITE_KEY?: string;
};

export const API_BASE_URL = env.VITE_API_URL || (env.PROD ? PROD_API_URL : DEV_API_URL);

/**
 * Chave pública (site key) do reCAPTCHA. Quando vazia, a tela de login não
 * mostra o widget e o login segue normal — o par disso no backend é
 * app.recaptcha.enabled=false. Defina VITE_RECAPTCHA_SITE_KEY para ativar.
 */
export const RECAPTCHA_SITE_KEY = env.VITE_RECAPTCHA_SITE_KEY || "";

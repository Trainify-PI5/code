// Endereco da API.
//
// Em desenvolvimento (npm run dev) usa o backend local. No site publicado usa a
// API hospedada no Render. Para apontar para outro backend, defina VITE_API_URL
// em um arquivo .env local.
const DEV_API_URL = "http://localhost:8080/api/v1";
const PROD_API_URL = "https://trainify-api-p2ka.onrender.com/api/v1";

const env = import.meta.env as unknown as { VITE_API_URL?: string; PROD?: boolean };

export const API_BASE_URL = env.VITE_API_URL || (env.PROD ? PROD_API_URL : DEV_API_URL);

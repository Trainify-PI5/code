import FieldError from "../../components/ui/FieldError";
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuthStore } from '../../store/authStore';
import { requestError } from '../../lib/requestError';
import logoLight from '../../assets/images/logotipo-modo_light.svg';
import logoDark from '../../assets/images/logotipo-modo_dark.svg';

const publicApi = axios.create({ baseURL: API_BASE_URL, timeout: 240000 });

export default function AcceptInvitation() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  const { isAuthenticated, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const working = useRef(false);
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const validPassword = password.length >= 8 && new TextEncoder().encode(password).length <= 72;

  async function accept(event: FormEvent) {
    event.preventDefault();
    if (working.current || !validToken || !validPassword || password !== confirmation) return;
    working.current = true;
    setSaving(true);
    setError('');
    try {
      await publicApi.post('/auth/invitations/accept', { token, password });
      setDone(true);
      setPassword('');
      setConfirmation('');
      window.history.replaceState(null, '', location.pathname);
    } catch (error) {
      setError(requestError(error, 'Não foi possível ativar sua conta. Tente novamente ou solicite um novo convite ao administrador.'));
    } finally { working.current = false; setSaving(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-surface-bright px-5 py-10 text-on-surface">
    <div className="w-full max-w-md space-y-6">
      <img src={logoLight} alt="Trainify" className="h-16 max-w-full dark:hidden" />
      <img src={logoDark} alt="Trainify" className="hidden h-16 max-w-full dark:block" />
      {done ? <>
        <h1 className="text-3xl font-bold">Conta ativada</h1>
        <p>Entre com o e-mail que recebeu o convite e a senha que você acabou de definir.</p>
        <Link to="/login" className="block rounded-xl bg-primary-container p-3 text-center font-bold text-white">Ir para o login</Link>
      </> : isAuthenticated ? <>
        <h1 className="text-2xl font-bold">Você já está conectado</h1>
        <p>Saia da conta atual para aceitar o convite com o e-mail do destinatário.</p>
        <button onClick={logout} className="rounded-xl bg-primary-container p-3 font-bold text-white">Sair para aceitar convite</button>
      </> : !validToken ? <>
        <h1 className="text-2xl font-bold">Convite indisponível</h1>
        <p>Abra o link completo recebido por e-mail ou solicite um novo convite ao administrador.</p>
        <Link to="/login" className="text-primary underline">Voltar ao login</Link>
      </> : <form onSubmit={accept} className="space-y-5">
        <h1 className="text-3xl font-bold">Ative sua conta</h1>
        <p className="text-on-surface-variant">O convite já define sua empresa, e-mail e perfil. Escolha uma senha para começar.</p>
        {error && <FieldError>{error}</FieldError>}
        <fieldset disabled={saving} className="space-y-5">
          <label className="block text-sm font-bold">Senha<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" aria-invalid={password.length >= 8 && !validPassword} aria-describedby={password.length >= 8 && !validPassword ? "invitation-password-error" : undefined} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3" /></label>
          <label className="block text-sm font-bold">Confirmar senha<input type="password" required autoComplete="new-password" aria-invalid={!!confirmation && confirmation !== password} aria-describedby={confirmation && confirmation !== password ? "invitation-confirmation-error" : undefined} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3" /></label>
          <p className="text-sm text-on-surface-variant">Use pelo menos 8 caracteres.</p>
          {password.length >= 8 && !validPassword && <FieldError id="invitation-password-error">A senha ficou longa demais. Use uma senha mais curta.</FieldError>}
          {confirmation && confirmation !== password && <FieldError id="invitation-confirmation-error">As senhas não coincidem.</FieldError>}
          <button type="submit" disabled={!validPassword || confirmation !== password} className="w-full rounded-xl bg-primary-container p-3 font-bold text-white disabled:opacity-50">{saving ? 'Ativando...' : 'Ativar conta'}</button>
        </fieldset>
      </form>}
    </div>
  </main>;
}

import { useState } from "react";
import { Lock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface ResetPasswordProps {
  token: string;
  onNavigate: (page: "login") => void;
}

export default function ResetPassword({ token, onNavigate }: ResetPasswordProps) {
  const { resetPassword, isLoading, error } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6 || password !== confirmation || !token) return;

    try {
      await resetPassword(token, password);
      setCompleted(true);
    } catch {
      return;
    }
  };

  if (completed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-bright px-6">
        <div className="w-full max-w-md space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="text-3xl font-display font-extrabold text-on-surface">Senha redefinida</h1>
          <p className="text-on-surface-variant">Sua senha foi atualizada com sucesso.</p>
          <button type="button" onClick={() => onNavigate("login")} className="w-full rounded-xl bg-primary-container py-3.5 text-sm font-bold text-white">
            Voltar ao login
          </button>
        </div>
      </main>
    );
  }

  const invalidForm = password.length < 6 || password !== confirmation || !token;

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-bright px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-on-surface">Redefinir senha</h1>
          <p className="mt-2 text-on-surface-variant">Crie uma nova senha para sua conta.</p>
        </div>
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <label className="block text-sm font-medium text-on-surface">
          Nova senha
          <div className="relative mt-2">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-4 text-sm text-on-surface outline-none focus:border-primary" />
          </div>
        </label>
        <label className="block text-sm font-medium text-on-surface">
          Confirmar senha
          <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none focus:border-primary" />
        </label>
        {password && password.length < 6 && <p className="text-xs text-red-500">A senha deve ter pelo menos 6 caracteres.</p>}
        {confirmation && password !== confirmation && <p className="text-xs text-red-500">As senhas não coincidem.</p>}
        <button type="submit" disabled={isLoading || invalidForm} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
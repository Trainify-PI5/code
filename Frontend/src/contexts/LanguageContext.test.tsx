import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

function Probe() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="home">{t('nav.home')}</span>
      <span data-testid="missing">{t('chave.inexistente')}</span>
      <button onClick={() => setLanguage('en')}>en</button>
      <button onClick={() => setLanguage('es')}>es</button>
      <button onClick={() => setLanguage('pt-BR')}>pt-BR</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
}

describe('LanguageContext', () => {
  it('usa pt-BR como idioma padrão', () => {
    renderProbe();
    expect(screen.getByTestId('language')).toHaveTextContent('pt-BR');
    expect(screen.getByTestId('home')).toHaveTextContent('Início');
  });

  it('traduz a mesma chave ao trocar de idioma', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('home')).toHaveTextContent('Home');

    await user.click(screen.getByRole('button', { name: 'es' }));
    expect(screen.getByTestId('language')).toHaveTextContent('es');
    expect(screen.getByTestId('home')).toHaveTextContent('Inicio');
  });

  it('devolve a própria chave quando a tradução não existe', () => {
    renderProbe();
    expect(screen.getByTestId('missing')).toHaveTextContent('chave.inexistente');
  });

  it('persiste o idioma escolhido em localStorage', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'es' }));

    expect(window.localStorage.getItem('language')).toBe('es');
  });

  it('restaura o idioma salvo em localStorage na montagem', () => {
    window.localStorage.setItem('language', 'en');

    renderProbe();

    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('home')).toHaveTextContent('Home');
  });

  it('useLanguage falha fora do LanguageProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(
      'useLanguage must be used within a LanguageProvider',
    );

    consoleError.mockRestore();
  });
});

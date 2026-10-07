import { render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { CompanyBrandingProvider, useBranding } from './CompanyBrandingContext';
import { useThemeStore } from '../store/themeStore';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
function Company() {
  const { company, update } = useBranding();
  return <><span>{company?.name}</span><button onClick={() => update({ id: '1', name: 'Salva', domain: null, primaryColor: '#000000', secondaryColor: '#ff0000', logoUrl: 'logo.png', logoKey: null })}>Salvar</button></>;
}
beforeEach(() => {
  vi.clearAllMocks();
  useThemeStore.setState({ isDarkMode: false });
});

it('aplica as cores, acompanha o tema e remove a personalização ao sair', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { name: 'Empresa', primaryColor: '#000000', secondaryColor: '#ff0000' } });
  const { unmount } = render(<CompanyBrandingProvider><Company /></CompanyBrandingProvider>);
  await screen.findByText('Empresa');
  await waitFor(() => expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#000000'));
  act(() => useThemeStore.setState({ isDarkMode: true }));
  expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('#000000');
  unmount();
  expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  expect(document.documentElement.style.getPropertyValue('--secondary')).toBe('');
});

it('ignora a resposta de uma empresa após trocar de sessão', async () => {
  let resolveOld!: (value: unknown) => void;
  vi.mocked(api.get).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const { rerender } = render(<CompanyBrandingProvider key="old"><Company /></CompanyBrandingProvider>);
  vi.mocked(api.get).mockResolvedValue({ data: { name: 'Empresa atual', primaryColor: '#123456' } });
  rerender(<CompanyBrandingProvider key="new"><Company /></CompanyBrandingProvider>);
  await screen.findByText('Empresa atual');
  await act(async () => resolveOld({ data: { name: 'Empresa anterior', primaryColor: '#ffffff' } }));
  expect(screen.queryByText('Empresa anterior')).not.toBeInTheDocument();
  expect(screen.getByText('Empresa atual')).toBeInTheDocument();
});

it('mantém a identidade padrão quando a personalização está desativada, inclusive ao salvar', () => {
  render(<CompanyBrandingProvider enabled={false}><Company /></CompanyBrandingProvider>);
  act(() => screen.getByRole('button', { name: 'Salvar' }).click());
  expect(api.get).not.toHaveBeenCalled();
  expect(screen.queryByText('Salva')).not.toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
});

it('remove as cores e a empresa ao desativar a personalização durante a sessão', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { name: 'Empresa', primaryColor: '#123456' } });
  const { rerender } = render(<CompanyBrandingProvider><Company /></CompanyBrandingProvider>);
  await screen.findByText('Empresa');
  expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('');
  rerender(<CompanyBrandingProvider enabled={false}><Company /></CompanyBrandingProvider>);
  expect(screen.queryByText('Empresa')).not.toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
});

import { render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { CompanyBrandingProvider, useBranding } from './CompanyBrandingContext';
import { useThemeStore } from '../store/themeStore';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
function Company() {
  const { company } = useBranding();
  return <span>{company?.name}</span>;
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

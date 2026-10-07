import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import TenantSettings from './TenantSettings';
import { ToastProvider } from '../components/ui';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('axios', () => ({ default: { put: vi.fn() } }));
const company = { id: '1', name: 'Empresa', domain: null, primaryColor: '#4b2c92', secondaryColor: '#9d84b7', logoUrl: null, logoKey: null };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: company }); });
const show = () => render(<ToastProvider><TenantSettings /></ToastProvider>);

it('permite tentar novamente quando o carregamento falha', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'));
  show();
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByLabelText('Nome da empresa')).toHaveValue('Empresa');
});

it('envia a logo ao armazenamento e só persiste ao salvar', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { key: 'tenant-1/logos/logo.png', url: 'https://storage.example/upload', previewUrl: 'https://storage.example/preview' } });
  vi.mocked(axios.put).mockResolvedValue({});
  vi.mocked(api.put).mockResolvedValue({ data: company });
  show();
  const file = new File(['logo'], 'logo.png', { type: 'image/png' });
  await userEvent.upload(await screen.findByLabelText('Logotipo'), file);
  await screen.findByText('Logo enviada. Salve as configurações para aplicar.');
  expect(api.put).not.toHaveBeenCalled();
  expect(axios.put).toHaveBeenCalledWith('https://storage.example/upload', file, { headers: { 'Content-Type': 'image/png' }, timeout: 60000 });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/tenants/me', expect.objectContaining({ logoKey: 'tenant-1/logos/logo.png', domain: null })));
});

it('não envia arquivos acima do limite', async () => {
  show();
  const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
  await userEvent.upload(await screen.findByLabelText('Logotipo'), file);
  expect(await screen.findByText('Use uma imagem PNG, JPEG ou WebP de até 2 MB.')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

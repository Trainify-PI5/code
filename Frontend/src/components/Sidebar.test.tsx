import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';

vi.mock('../services/api', () => ({ default: {} }));
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

it.each(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'STUDENT'])('mantém nomes, ícones e destinos distintos no menu de %s', role => {
  useAuthStore.setState({ user: { id: '1', name: 'Teste', email: 'test@example.com', role, department: '' } });
  const navigate = vi.fn();
  render(<Sidebar activeTab="home" onTabChange={navigate} isCollapsed={false} />);
  const buttons = screen.getAllByRole('button');
  const names = buttons.map(button => button.getAttribute('aria-label'));
  expect(names.every(Boolean)).toBe(true);
  expect(new Set(names).size).toBe(buttons.length);
  const icons = buttons.map(button => [...button.querySelector('svg')!.classList].find(name => name.startsWith('lucide-')));
  expect(new Set(icons).size).toBe(buttons.length);
  buttons.forEach(button => fireEvent.click(button));
  const destinations = navigate.mock.calls.map(([destination]) => destination);
  expect(new Set(destinations).size).toBe(buttons.length);
  expect(destinations.includes('sales-requests')).toBe(role === 'SUPER_ADMIN');
  expect(destinations.includes('companies')).toBe(role === 'SUPER_ADMIN');
  expect(destinations.includes('invitations')).toBe(['ADMIN', 'SUPER_ADMIN'].includes(role));
  expect(destinations.includes('tenant-settings')).toBe(['ADMIN', 'SUPER_ADMIN'].includes(role));
});

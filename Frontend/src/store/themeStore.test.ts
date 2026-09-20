import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    act(() => useThemeStore.getState().setDarkMode(false));
    window.localStorage.clear();
  });

  it('começa no modo claro', () => {
    expect(useThemeStore.getState().isDarkMode).toBe(false);
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('toggleDarkMode alterna o estado', () => {
    act(() => useThemeStore.getState().toggleDarkMode());
    expect(useThemeStore.getState().isDarkMode).toBe(true);

    act(() => useThemeStore.getState().toggleDarkMode());
    expect(useThemeStore.getState().isDarkMode).toBe(false);
  });

  it('toggleDarkMode adiciona e remove a classe "dark" no <html>', () => {
    act(() => useThemeStore.getState().toggleDarkMode());
    expect(document.documentElement).toHaveClass('dark');

    act(() => useThemeStore.getState().toggleDarkMode());
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('setDarkMode(true) ativa o tema escuro', () => {
    act(() => useThemeStore.getState().setDarkMode(true));
    expect(useThemeStore.getState().isDarkMode).toBe(true);
    expect(document.documentElement).toHaveClass('dark');
  });

  it('setDarkMode é idempotente', () => {
    act(() => useThemeStore.getState().setDarkMode(true));
    act(() => useThemeStore.getState().setDarkMode(true));
    expect(useThemeStore.getState().isDarkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persiste a preferência em localStorage sob a chave "trainify-theme"', () => {
    act(() => useThemeStore.getState().setDarkMode(true));

    const raw = window.localStorage.getItem('trainify-theme');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.isDarkMode).toBe(true);
  });

  it('notifica assinantes quando o tema muda', () => {
    const seen: boolean[] = [];
    const unsubscribe = useThemeStore.subscribe((state) => seen.push(state.isDarkMode));

    act(() => useThemeStore.getState().toggleDarkMode());
    act(() => useThemeStore.getState().setDarkMode(false));
    unsubscribe();

    expect(seen).toEqual([true, false]);
  });
});

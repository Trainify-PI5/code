import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.classList.remove('dark');
});

// O jsdom nao implementa matchMedia. Sem isto, todo componente que escolhe
// layout por largura cai no ramo de celular durante os testes. Fixamos em
// "desktop" porque e o layout que as asserts descrevem (tabela, e nao cartoes);
// um teste de celular sobrescreve este mock localmente.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// Outra lacuna do jsdom: nenhum navegador real fica sem scrollIntoView, entao
// nao faz sentido proteger a chamada no componente so por causa do teste.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

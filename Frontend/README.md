# Trainify LMS — Frontend

## Testes

A suíte usa **Vitest** + **React Testing Library** com ambiente `jsdom`.

```bash
npm install
npm test              # roda a suíte uma vez
npm run test:watch    # modo watch
npm run test:coverage # relatório de cobertura (texto + HTML em coverage/)
```

### Organização

- Configuração: [vitest.config.ts](vitest.config.ts)
- Setup global (matchers do `jest-dom`, cleanup, limpeza de storages e da classe `dark`): [src/test/setup.ts](src/test/setup.ts)
- Os testes ficam ao lado do código que cobrem, no padrão `*.test.ts` / `*.test.tsx`.

### Cobertura atual

| Alvo | Arquivo de teste |
| --- | --- |
| `cn()` (merge de classes Tailwind) | `src/lib/utils.test.ts` |
| `authStore` (login, register, recuperação de senha, logout, refresh, hidratação) | `src/store/authStore.test.ts` |
| `themeStore` (toggle, persistência, classe `dark` no `<html>`) | `src/store/themeStore.test.ts` |
| `LanguageContext` (i18n, persistência, guard do hook) | `src/contexts/LanguageContext.test.tsx` |

O `coverage` é medido sobre `src/lib`, `src/store` e `src/contexts`.

### Escrevendo novos testes

- Para stores Zustand, chame as ações via `useAuthStore.getState()` dentro de `act()` e restaure o estado inicial com `setState` no `beforeEach`.
- Chamadas HTTP são isoladas com `vi.mock('../services/api')` — nenhum teste toca a rede.
- Para componentes, renderize com `render()` da React Testing Library e prefira queries por papel/acessibilidade (`getByRole`).

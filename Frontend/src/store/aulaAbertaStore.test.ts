import { beforeEach, expect, it } from 'vitest';
import { useAulaAbertaStore } from './aulaAbertaStore';

const nr5 = { lessonId: 'nr5', courseId: 'nrs', titulo: 'NR-5: CIPA' };
const nr35 = { lessonId: 'nr35', courseId: 'nrs', titulo: 'NR-35: Trabalho em altura' };

beforeEach(() => useAulaAbertaStore.setState({ aula: null }));

it('guarda a aula aberta e limpa ao sair dela', () => {
  useAulaAbertaStore.getState().abrir(nr5);
  expect(useAulaAbertaStore.getState().aula).toEqual(nr5);

  useAulaAbertaStore.getState().fechar('nr5');
  expect(useAulaAbertaStore.getState().aula).toBeNull();
});

it('a saída da aula anterior não apaga a que abriu no lugar dela', () => {
  useAulaAbertaStore.getState().abrir(nr5);
  useAulaAbertaStore.getState().abrir(nr35);
  useAulaAbertaStore.getState().fechar('nr5');

  expect(useAulaAbertaStore.getState().aula).toEqual(nr35);
});

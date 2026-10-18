import { describe, expect, it } from 'vitest';
import { requestError } from './requestError';

/**
 * O chat do assistente mostrava "O assistente não respondeu. Tente novamente."
 * para qualquer erro. O backend explica o motivo no campo "detail", e jogar isso
 * fora deixava quem usa sem saída e quem investiga sem pista — foi o que nos
 * custou tempo quando o assistente parou de responder numa aula.
 */
describe('motivo da falha do assistente', () => {
  function erro(status: number, detail?: string) {
    return {
      isAxiosError: true,
      response: { status, data: detail === undefined ? {} : { detail } },
    };
  }

  const padrao = 'O assistente não respondeu. Tente novamente.';

  it('mostra o motivo que o backend explicou', () => {
    expect(requestError(erro(400, 'Não há material suficiente para a IA.'), padrao))
      .toBe('Não há material suficiente para a IA.');
  });

  it('mostra a recusa de acesso em vez de parecer falha do sistema', () => {
    expect(requestError(erro(403, 'Você não tem acesso a este curso.'), padrao))
      .toBe('Você não tem acesso a este curso.');
  });

  it('cai no texto genérico quando o erro é do servidor e não explica nada', () => {
    expect(requestError(erro(500), padrao)).toBe(padrao);
  });

  it('cai no texto genérico quando nem resposta houve', () => {
    expect(requestError(new Error('rede caiu'), padrao)).toBe(padrao);
  });
});

import { expect, it } from 'vitest';
import { requestError } from './requestError';

it('identifica operação indisponível sem atribuir a falha ao e-mail', () => {
  expect(requestError({ isAxiosError: true, response: { status: 405, data: {} } }, 'Falha genérica'))
    .toBe('Esta operação ainda não está disponível no servidor. Solicite a atualização da plataforma.');
});

it('preserva a explicação de uma falha de validação do servidor', () => {
  expect(requestError({ isAxiosError: true, response: { status: 400, data: { detail: 'Convite expirado.' } } }, 'Falha genérica'))
    .toBe('Convite expirado.');
});

it('não expõe detalhes internos de erros inesperados', () => {
  expect(requestError({ isAxiosError: true, response: { status: 500, data: { detail: 'Internal details' } } }, 'Falha genérica'))
    .toBe('Falha genérica');
});

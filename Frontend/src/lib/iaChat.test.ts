import { expect, it } from 'vitest';
import { LIMITE_HISTORICO, montarHistorico } from './iaChat';

it('monta o histórico sem saudação nem avisos de erro', () => {
  expect(montarHistorico([
    { role: 'model', text: 'Olá! Como posso ajudar?', historico: false },
    { role: 'user', text: 'O que é EPI?' },
    { role: 'model', text: 'Equipamento de proteção individual.' },
    { role: 'model', text: 'O assistente está indisponível.', historico: false },
    { role: 'user', text: '   ' },
  ])).toEqual([
    { role: 'user', content: 'O que é EPI?' },
    { role: 'assistant', content: 'Equipamento de proteção individual.' },
  ]);
});

it('envia só as mensagens mais recentes', () => {
  const muitas = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `m${i}` }));
  const historico = montarHistorico(muitas);
  expect(historico).toHaveLength(LIMITE_HISTORICO);
  expect(historico.at(-1)?.content).toBe('m24');
});

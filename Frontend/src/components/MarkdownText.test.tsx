import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import MarkdownText from './MarkdownText';

it('mostra negrito, listas e tabelas das respostas da IA', () => {
  const { container } = render(<MarkdownText text={[
    'Segundo a **NR-6**, cabe à organização:',
    '',
    '1. fornecer o EPI;',
    '2. exigir o uso.',
    '',
    '| Treinamento | Carga |',
    '|---|---|',
    '| Básico | 40 h<br>presencial |',
  ].join('\n')} />);

  expect(screen.getByText('NR-6').tagName).toBe('STRONG');
  expect(container.querySelectorAll('ol li')).toHaveLength(2);
  expect(screen.getByRole('columnheader', { name: 'Treinamento' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Básico' })).toBeInTheDocument();
});

it('não interpreta HTML vindo do modelo', () => {
  const { container } = render(<MarkdownText text={'Olá <img src=x onerror="alert(1)"> **mundo**'} />);
  expect(container.querySelector('img')).toBeNull();
  expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
});

it('lista cada aula de origem uma vez', () => {
  render(<MarkdownText text="Resposta" sources={[
    { courseId: 'c', lessonId: 'a', lessonTitle: 'NR-35' },
    { courseId: 'c', lessonId: 'a', lessonTitle: 'NR-35' },
    { courseId: 'c', lessonId: 'b', lessonTitle: 'NR-6' },
  ]} />);
  expect(screen.getAllByText(/NR-/)).toHaveLength(2);
});

it('mostra citações (>) como bloco, sem o sinal', () => {
  const { container } = render(<MarkdownText text={'> **Observação:** o material não cobre isso.'} />);
  expect(container.querySelector('blockquote')?.textContent).toBe('Observação: o material não cobre isso.');
});

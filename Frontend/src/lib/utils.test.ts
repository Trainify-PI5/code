import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('junta múltiplas classes em uma única string', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('ignora valores falsy', () => {
    expect(cn('text-sm', false, null, undefined, '')).toBe('text-sm');
  });

  it('aplica classes condicionais a partir de um objeto', () => {
    expect(cn('btn', { 'btn-active': true, 'btn-disabled': false })).toBe('btn btn-active');
  });

  it('achata arrays aninhados', () => {
    expect(cn(['flex', ['items-center', 'gap-2']])).toBe('flex items-center gap-2');
  });

  it('resolve conflitos do Tailwind mantendo a última classe', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('não remove classes de propriedades diferentes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('respeita variantes responsivas e de estado como escopos separados', () => {
    expect(cn('p-2', 'md:p-4', 'hover:p-6')).toBe('p-2 md:p-4 hover:p-6');
  });

  it('retorna string vazia quando não recebe argumentos', () => {
    expect(cn()).toBe('');
  });
});

import { expect, it } from 'vitest';
import { brandVariables, contrast } from './branding';

it('mantém contraste de textos e botões para cores claras e escuras', () => {
  for (const color of ['#ffffff', '#000000', '#ffff00', '#4b2c92', '#ff0000']) {
    for (const dark of [false, true]) {
      const variables = brandVariables(color, color, dark);
      expect(contrast(variables['--primary'], dark ? '#141414' : '#ffffff')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(variables['--primary-container'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
  }
});

it('preserva o tema padrão quando não há cores válidas', () => {
  expect(brandVariables(null, 'invalid', false)).toEqual({});
});

const hexPattern = /^#[0-9a-f]{6}$/i;
export const validBrandColor = (value: string) => hexPattern.test(value);
const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
function mix(color: string, target: string, amount: number) {
  const destination = rgb(target);
  return '#' + rgb(color).map((value, index) => Math.round(value + (destination[index] - value) * amount).toString(16).padStart(2, '0')).join('');
}
function luminance(color: string) {
  const values = rgb(color).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
function readable(color: string, background: string, target: string) {
  for (let step = 0; step <= 100; step++) {
    const result = mix(color, target, step / 100);
    if (contrast(result, background) >= 4.5) return result;
  }
  return target;
}
export function brandVariables(primary: string | null, secondary: string | null, dark: boolean) {
  const variables: Record<string, string> = {};
  for (const [name, color] of [['primary', primary], ['secondary', secondary]]) {
    if (!color || !validBrandColor(color)) continue;
    const text = readable(color, dark ? '#141414' : '#ffffff', dark ? '#ffffff' : '#000000');
    variables[`--${name}`] = text;
    variables[`--${name}-container`] = readable(color, '#ffffff', '#000000');
    variables[`--${name}-fixed`] = mix(color, dark ? '#000000' : '#ffffff', dark ? 0.8 : 0.92);
    if (name === 'primary') variables['--on-primary-fixed'] = text;
  }
  return variables;
}

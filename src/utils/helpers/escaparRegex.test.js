import { escaparRegex } from './escaparRegex.js';

describe('escaparRegex', () => {
  it.each([
    ['c++', 'c\\+\\+'],
    ['.net', '\\.net'],
    ['(a+)+$', '\\(a\\+\\)\\+\\$'],
    ['a|b', 'a\\|b'],
    ['[x]{2}', '\\[x\\]\\{2\\}'],
    ['^\\d?*', '\\^\\\\d\\?\\*'],
  ])('escapa %p', (texto, esperado) => {
    expect(escaparRegex(texto)).toBe(esperado);
  });

  it('mantém texto comum', () => {
    expect(escaparRegex('Ana Maria')).toBe('Ana Maria');
  });

  it.each(['c++', '(a+)+$', '.net', 'a|b'])('o padrão escapado casa só o literal %p', (texto) => {
    const regex = new RegExp(escaparRegex(texto), 'i');

    expect(regex.test(`vaga ${texto} sênior`)).toBe(true);
    expect(regex.test('vaga sem o termo')).toBe(false);
  });
});

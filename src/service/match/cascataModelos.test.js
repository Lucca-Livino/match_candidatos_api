import { novaCascata, degrauAtual, acabou, descer, trilha } from './cascataModelos.js';

describe('cascataModelos', () => {
  it.each([undefined, 'gemini', []])('rejeita cascata inválida (%j)', (modelos) => {
    expect(() => novaCascata(modelos)).toThrow(
      expect.objectContaining({ statusCode: 500, code: 'AI_CASCADE_EMPTY' }),
    );
  });

  it('começa no primeiro degrau com uma cópia da lista', () => {
    const modelos = ['a', 'b'];
    const estado = novaCascata(modelos);
    modelos.push('c');

    expect(estado).toEqual({ modelos: ['a', 'b'], indice: 0, esgotados: [] });
    expect(degrauAtual(estado)).toBe('a');
    expect(acabou(estado)).toBe(false);
  });

  it('desce registrando o degrau esgotado e o motivo', () => {
    const estado = descer(novaCascata(['a', 'b']), 'cota diaria');

    expect(degrauAtual(estado)).toBe('b');
    expect(estado.esgotados).toEqual([{ modelo: 'a', motivo: 'cota diaria', em: expect.any(String) }]);
    expect(trilha(estado)).toEqual({ usados: ['a', 'b'], esgotados: estado.esgotados });
  });

  it('depois do último degrau acaba e não tem degrau atual', () => {
    const estado = descer(descer(novaCascata(['a', 'b']), 'x'), 'y');

    expect(acabou(estado)).toBe(true);
    expect(degrauAtual(estado)).toBeNull();
    expect(trilha(estado).usados).toEqual(['a', 'b']);
  });
});

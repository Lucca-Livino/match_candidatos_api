import { validateUpdateConfiguracao } from './configuracaoValidators.js';

describe('validateUpdateConfiguracao', () => {
  it('aceita todos os campos e converte números em string', () => {
    expect(
      validateUpdateConfiguracao({
        limiteCompatibilidade: '0.7',
        provedor: ' gemini ',
        temperatura: 0,
        cascata: ['m1', 'm2'],
        ativo: 1,
      }),
    ).toEqual({ limiteCompatibilidade: 0.7, provedor: 'gemini', temperatura: 0, cascata: ['m1', 'm2'], ativo: true });
  });

  it('devolve só os campos presentes no payload', () => {
    expect(validateUpdateConfiguracao({ ativo: false })).toEqual({ ativo: false });
  });

  it.each([0, 1])('aceita limiteCompatibilidade no extremo %p', (limite) => {
    expect(validateUpdateConfiguracao({ limiteCompatibilidade: limite }).limiteCompatibilidade).toBe(limite);
  });

  it.each([-0.1, 1.1, 'abc'])('recusa limiteCompatibilidade %p', (limite) => {
    expect(() => validateUpdateConfiguracao({ limiteCompatibilidade: limite })).toThrow(
      'limiteCompatibilidade deve estar entre 0 e 1.',
    );
  });

  it.each([-1, 2, 'quente'])('recusa temperatura %p', (temperatura) => {
    expect(() => validateUpdateConfiguracao({ temperatura })).toThrow('temperatura deve estar entre 0 e 1.');
  });

  it('recusa provedor fora da lista e informa os permitidos', () => {
    expect(() => validateUpdateConfiguracao({ provedor: 'openai' })).toThrow(
      expect.objectContaining({ message: 'provedor inválido.', details: { allowed: ['gemini'] } }),
    );
  });

  describe('cascata', () => {
    it('descarta degraus em branco e apara os nomes', () => {
      expect(validateUpdateConfiguracao({ cascata: [' m1 ', '', null, 'm2'] }).cascata).toEqual(['m1', 'm2']);
    });

    it('recusa valor que não é lista', () => {
      expect(() => validateUpdateConfiguracao({ cascata: 'm1' })).toThrow('cascata deve ser uma lista de modelos.');
    });

    it('recusa lista que fica vazia depois da limpeza', () => {
      expect(() => validateUpdateConfiguracao({ cascata: ['', '  '] })).toThrow(
        'cascata precisa de pelo menos um modelo.',
      );
    });

    it('aceita até 4 degraus e recusa o quinto', () => {
      expect(validateUpdateConfiguracao({ cascata: ['a', 'b', 'c', 'd'] }).cascata).toHaveLength(4);
      expect(() => validateUpdateConfiguracao({ cascata: ['a', 'b', 'c', 'd', 'e'] })).toThrow(
        'cascata aceita no máximo 4 modelos.',
      );
    });

    it('recusa modelo repetido, inclusive depois de aparar', () => {
      expect(() => validateUpdateConfiguracao({ cascata: ['m1', ' m1'] })).toThrow('cascata não pode repetir modelo.');
    });
  });

  it('recusa payload sem nenhum campo conhecido', () => {
    expect(() => validateUpdateConfiguracao({ outro: 1 })).toThrow('Nenhum campo válido informado.');
  });

  it.each([null, [], 'x'])('recusa payload %p', (payload) => {
    expect(() => validateUpdateConfiguracao(payload)).toThrow('Payload inválido.');
  });
});

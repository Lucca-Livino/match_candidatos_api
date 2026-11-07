import { validatePeriodo } from '../../../../utils/validators/relatorioValidators.js';

describe('validatePeriodo', () => {
  it('ausente ou vazio vira tudo', () => {
    expect(validatePeriodo(undefined)).toBe('tudo');
    expect(validatePeriodo('')).toBe('tudo');
  });

  it('normaliza caixa e espacos', () => {
    expect(validatePeriodo(' 30D ')).toBe('30d');
  });

  it('valor fora da lista e 400', () => {
    expect(() => validatePeriodo('7d')).toThrow(expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' }));
  });
});

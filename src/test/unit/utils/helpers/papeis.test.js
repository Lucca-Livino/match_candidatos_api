import { conduzProcesso } from '../../../../utils/helpers/papeis.js';

describe('conduzProcesso', () => {
  it.each([
    [['administrador'], true],
    [['candidato', 'recrutador'], true],
    [['candidato'], false],
    [[], false],
  ])('com os papéis %j devolve %s', (tipos, esperado) => {
    expect(conduzProcesso({ user: { tipos_permissao: tipos } })).toBe(esperado);
  });

  it.each([{}, { user: {} }])('sem papéis definidos devolve false (%j)', (req) => {
    expect(conduzProcesso(req)).toBe(false);
  });
});

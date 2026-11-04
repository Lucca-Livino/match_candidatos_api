import { validateCreateRota, validatePatchRota } from './rotaValidators.js';

describe('validateCreateRota', () => {
  it('aceita route e domain e só copia os booleanos de método informados', () => {
    expect(validateCreateRota({ route: 'vagas', domain: 'localhost', get: true, post: false })).toEqual({
      route: 'vagas',
      domain: 'localhost',
      get: true,
      post: false,
    });
  });

  it('descarta flags que não são booleanas e campos desconhecidos', () => {
    expect(validateCreateRota({ route: 'vagas', domain: 'localhost', get: 'true', admin: true })).toEqual({
      route: 'vagas',
      domain: 'localhost',
    });
  });

  it.each([
    [{ domain: 'localhost' }, 'Campo route é obrigatório.'],
    [{ route: '', domain: 'localhost' }, 'Campo route é obrigatório.'],
    [{ route: 'vagas' }, 'Campo domain é obrigatório.'],
    [{ route: 'vagas', domain: 1 }, 'Campo domain é obrigatório.'],
  ])('recusa %j', (body, mensagem) => {
    expect(() => validateCreateRota(body)).toThrow(mensagem);
  });
});

describe('validatePatchRota', () => {
  it('aceita só um booleano de método', () => {
    expect(validatePatchRota({ delete: false })).toEqual({ delete: false });
  });

  it('aceita active, route e domain', () => {
    expect(validatePatchRota({ active: false, route: 'r', domain: 'd' })).toEqual({
      active: false,
      route: 'r',
      domain: 'd',
    });
  });

  it('recusa corpo sem nenhum campo válido', () => {
    expect(() => validatePatchRota({ get: 1, outro: true })).toThrow('Nenhum campo válido para atualizar.');
    expect(() => validatePatchRota()).toThrow('Nenhum campo válido para atualizar.');
  });
});

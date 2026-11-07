import { validateCreateGrupo, validatePatchGrupo } from '../../../../utils/validators/grupoValidators.js';

const permissao = (route, domain = 'localhost') => ({ route, domain });

describe('validateCreateGrupo', () => {
  it('aceita nome e descrição, com ativo true e sem permissões por padrão', () => {
    expect(validateCreateGrupo({ nome: 'RH', descricao: 'Recrutadores' })).toEqual({
      nome: 'RH',
      descricao: 'Recrutadores',
      ativo: true,
      permissions: [],
    });
  });

  it('respeita ativo false e mantém as permissões', () => {
    const permissions = [permissao('vagas'), permissao('candidaturas')];
    expect(validateCreateGrupo({ nome: 'RH', descricao: 'd', ativo: false, permissions })).toMatchObject({
      ativo: false,
      permissions,
    });
  });

  it('ignora ativo que não é booleano', () => {
    expect(validateCreateGrupo({ nome: 'RH', descricao: 'd', ativo: 'false' }).ativo).toBe(true);
  });

  it.each([
    [{ descricao: 'd' }, 'Campo nome é obrigatório.'],
    [{ nome: 10, descricao: 'd' }, 'Campo nome é obrigatório.'],
    [{ nome: 'RH' }, 'Campo descrição é obrigatório.'],
    [{ nome: 'RH', descricao: '' }, 'Campo descrição é obrigatório.'],
  ])('recusa %j', (body, mensagem) => {
    expect(() => validateCreateGrupo(body)).toThrow(mensagem);
  });

  it('recusa route + domain repetidos', () => {
    const permissions = [permissao('vagas'), permissao('vagas')];
    expect(() => validateCreateGrupo({ nome: 'RH', descricao: 'd', permissions })).toThrow(
      'Permissões duplicadas',
    );
  });

  it('aceita a mesma rota em domínios diferentes', () => {
    const permissions = [permissao('vagas', 'a'), permissao('vagas', 'b')];
    expect(validateCreateGrupo({ nome: 'RH', descricao: 'd', permissions }).permissions).toHaveLength(2);
  });

  it('o erro sai como 400 VALIDATION_ERROR', () => {
    expect(() => validateCreateGrupo({})).toThrow(expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' }));
  });
});

describe('validatePatchGrupo', () => {
  it('devolve só os campos válidos informados', () => {
    expect(validatePatchGrupo({ nome: 'Novo', ativo: false, extra: 'x', descricao: 5 })).toEqual({
      nome: 'Novo',
      ativo: false,
    });
  });

  it('valida duplicidade das permissões também no patch', () => {
    expect(() => validatePatchGrupo({ permissions: [permissao('a'), permissao('a')] })).toThrow(
      'Permissões duplicadas',
    );
  });

  it('aceita lista de permissões vazia', () => {
    expect(validatePatchGrupo({ permissions: [] })).toEqual({ permissions: [] });
  });

  it('recusa corpo sem nenhum campo válido', () => {
    expect(() => validatePatchGrupo({ ativo: 'sim' })).toThrow('Nenhum campo válido para atualizar.');
    expect(() => validatePatchGrupo()).toThrow('Nenhum campo válido para atualizar.');
  });
});

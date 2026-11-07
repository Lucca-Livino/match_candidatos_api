import {
  validateCreateQuestionario,
  validateUpdateQuestionario,
  validatePatchQuestionarioAtivo,
  validateListQuestionarioQuery,
} from '../../../../utils/validators/questionarioValidators.js';

const valido = { vagaId: ' v1 ', criadoPor: ' u1 ', titulo: '  Teste técnico ' };

describe('validateCreateQuestionario', () => {
  it('apara os campos e usa ativo 1 e instruções vazias por padrão', () => {
    expect(validateCreateQuestionario(valido)).toEqual({
      vagaId: 'v1',
      criadoPor: 'u1',
      titulo: 'Teste técnico',
      instrucoes: '',
      ativo: 1,
    });
  });

  it('aceita instruções e ativo 0 em string', () => {
    expect(validateCreateQuestionario({ ...valido, instrucoes: ' leia ', ativo: '0' })).toMatchObject({
      instrucoes: 'leia',
      ativo: 0,
    });
  });

  it.each([
    [{ ...valido, vagaId: '' }, 'vagaId é obrigatório.'],
    [{ ...valido, criadoPor: ' ' }, 'criadoPor é obrigatório.'],
    [{ ...valido, titulo: 'ab ' }, 'título é obrigatório e deve ter ao menos 3 caracteres.'],
    [{ ...valido, ativo: 2 }, 'ativo deve ser 0 ou 1.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateQuestionario(payload)).toThrow(mensagem);
  });

  it('recusa payload que não é objeto', () => {
    expect(() => validateCreateQuestionario(null)).toThrow('Payload inválido.');
  });
});

describe('validateUpdateQuestionario', () => {
  it('devolve só os campos informados, aparados', () => {
    expect(validateUpdateQuestionario({ titulo: ' Novo título ', instrucoes: null })).toEqual({
      titulo: 'Novo título',
      instrucoes: '',
    });
  });

  it.each([
    [{ vagaId: ' ' }, 'vagaId não pode ser vazio.'],
    [{ criadoPor: '' }, 'criadoPor não pode ser vazio.'],
    [{ titulo: 'ab' }, 'título deve ter ao menos 3 caracteres.'],
    [{ ativo: 1 }, 'Informe ao menos um campo válido para atualização.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateQuestionario(payload)).toThrow(mensagem);
  });
});

describe('validatePatchQuestionarioAtivo', () => {
  it.each([
    [0, 0],
    ['1', 1],
  ])('aceita ativo %p', (ativo, esperado) => {
    expect(validatePatchQuestionarioAtivo({ ativo })).toEqual({ ativo: esperado });
  });

  it('exige o campo ativo', () => {
    expect(() => validatePatchQuestionarioAtivo({})).toThrow('ativo é obrigatório.');
  });

  it('recusa valor fora de 0 e 1', () => {
    expect(() => validatePatchQuestionarioAtivo({ ativo: 'sim' })).toThrow('ativo deve ser 0 ou 1.');
  });
});

describe('validateListQuestionarioQuery', () => {
  it('apara vagaId e converte ativo', () => {
    expect(validateListQuestionarioQuery({ vagaId: ' v1 ', ativo: '1' })).toEqual({ vagaId: 'v1', ativo: 1 });
  });

  it('ignora ativo inválido e filtros ausentes', () => {
    expect(validateListQuestionarioQuery({ ativo: 'x' })).toEqual({ vagaId: undefined, ativo: undefined });
    expect(validateListQuestionarioQuery()).toEqual({ vagaId: undefined, ativo: undefined });
  });
});

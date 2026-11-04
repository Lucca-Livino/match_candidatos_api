import {
  validateCreatePergunta,
  validateUpdatePergunta,
  validateCreateOpcaoResposta,
  validateUpdateOpcaoResposta,
  validateListPerguntaQuery,
  validateReorderPerguntas,
} from './perguntaValidators.js';

const valida = { questionarioId: ' q1 ', enunciado: ' Qual a capital? ', tipoResposta: ' Dissertativa ', peso: '2', ordem: '1' };

describe('validateCreatePergunta', () => {
  it('normaliza os campos e usa obrigatoria 1 por padrão', () => {
    expect(validateCreatePergunta(valida)).toEqual({
      questionarioId: 'q1',
      enunciado: 'Qual a capital?',
      tipoResposta: 'dissertativa',
      peso: 2,
      obrigatoria: 1,
      ordem: 1,
    });
  });

  it('aceita obrigatoria 0', () => {
    expect(validateCreatePergunta({ ...valida, obrigatoria: 0 }).obrigatoria).toBe(0);
  });

  it('aceita peso 0', () => {
    expect(validateCreatePergunta({ ...valida, peso: 0 }).peso).toBe(0);
  });

  it.each([
    [{ ...valida, questionarioId: '' }, 'questionarioId é obrigatório.'],
    [{ ...valida, enunciado: 'oi' }, 'enunciado é obrigatório e deve ter ao menos 3 caracteres.'],
    [{ ...valida, tipoResposta: 'escala' }, 'tipoResposta inválido.'],
    [{ ...valida, peso: -1 }, 'peso deve ser um número maior ou igual a 0.'],
    [{ ...valida, peso: 'muito' }, 'peso deve ser um número maior ou igual a 0.'],
    [{ ...valida, obrigatoria: 3 }, 'obrigatoria deve ser 0 ou 1.'],
    [{ ...valida, ordem: 0 }, 'ordem deve ser um inteiro maior ou igual a 1.'],
    [{ ...valida, ordem: undefined }, 'ordem deve ser um inteiro maior ou igual a 1.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreatePergunta(payload)).toThrow(mensagem);
  });

  it('informa os tipos permitidos quando o tipo é inválido', () => {
    expect(() => validateCreatePergunta({ ...valida, tipoResposta: 'x' })).toThrow(
      expect.objectContaining({
        details: { allowed: ['multipla_escolha', 'dissertativa', 'verdadeiro_falso'] },
      }),
    );
  });
});

describe('validateUpdatePergunta', () => {
  it('devolve só os campos informados', () => {
    expect(validateUpdatePergunta({ ordem: '3', tipoResposta: 'VERDADEIRO_FALSO' })).toEqual({
      ordem: 3,
      tipoResposta: 'verdadeiro_falso',
    });
  });

  it.each([
    [{ enunciado: ' a ' }, 'enunciado deve ter ao menos 3 caracteres.'],
    [{ peso: -0.5 }, 'peso deve ser um número maior ou igual a 0.'],
    [{ obrigatoria: 'sim' }, 'obrigatoria deve ser 0 ou 1.'],
    [{ questionarioId: 'q2' }, 'Informe ao menos um campo válido para atualização.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdatePergunta(payload)).toThrow(mensagem);
  });
});

describe('validateCreateOpcaoResposta', () => {
  it('apara o texto e usa correta 0 por padrão', () => {
    expect(validateCreateOpcaoResposta({ texto: ' Brasília ', ordem: 1 })).toEqual({
      texto: 'Brasília',
      correta: 0,
      ordem: 1,
    });
  });

  it('aceita correta 1', () => {
    expect(validateCreateOpcaoResposta({ texto: 'A', correta: '1', ordem: 2 }).correta).toBe(1);
  });

  it.each([
    [{ texto: ' ', ordem: 1 }, 'texto é obrigatório para a opção de resposta.'],
    [{ texto: 'A', correta: 2, ordem: 1 }, 'correta deve ser 0 ou 1.'],
    [{ texto: 'A' }, 'ordem deve ser um inteiro maior ou igual a 1.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateOpcaoResposta(payload)).toThrow(mensagem);
  });
});

describe('validateUpdateOpcaoResposta', () => {
  it('devolve só os campos informados', () => {
    expect(validateUpdateOpcaoResposta({ correta: 1 })).toEqual({ correta: 1 });
  });

  it.each([
    [{ texto: '' }, 'texto não pode ser vazio.'],
    [{ ordem: -2 }, 'ordem deve ser um inteiro maior ou igual a 1.'],
    [{}, 'Informe ao menos um campo válido para atualização.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateOpcaoResposta(payload)).toThrow(mensagem);
  });
});

describe('validateListPerguntaQuery', () => {
  it('exige e apara questionarioId', () => {
    expect(validateListPerguntaQuery({ questionarioId: ' q1 ' })).toEqual({ questionarioId: 'q1' });
    expect(() => validateListPerguntaQuery()).toThrow('questionarioId é obrigatório na query.');
  });
});

describe('validateReorderPerguntas', () => {
  it('aceita objeto com questionarioId e lista de perguntas', () => {
    expect(
      validateReorderPerguntas({ questionarioId: ' q1 ', perguntas: [{ id: 'p1', ordem: '2' }, { id: 'p2', ordem: 1 }] }),
    ).toEqual({
      questionarioId: 'q1',
      perguntas: [
        { id: 'p1', ordem: 2 },
        { id: 'p2', ordem: 1 },
      ],
    });
  });

  it('aceita a lista direto no corpo, sem questionarioId', () => {
    expect(validateReorderPerguntas([{ id: 'p1', ordem: 1 }])).toEqual({
      questionarioId: '',
      perguntas: [{ id: 'p1', ordem: 1 }],
    });
  });

  it.each([
    [[], 'perguntas deve ser um array não vazio.'],
    [{ perguntas: [] }, 'perguntas deve ser um array não vazio.'],
    [null, 'Payload inválido.'],
    [[{ ordem: 1 }], 'perguntas[0].id é obrigatório.'],
    [[{ id: 'p1', ordem: 1 }, { id: 'p2', ordem: 0 }], 'perguntas[1].ordem deve ser um inteiro maior ou igual a 1.'],
    [[{ id: 'p1', ordem: 1 }, { id: 'p1', ordem: 2 }], 'Não é permitido repetir id na reordenação.'],
    [[{ id: 'p1', ordem: 1 }, { id: 'p2', ordem: 1 }], 'Não é permitido repetir ordem na reordenação.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateReorderPerguntas(payload)).toThrow(mensagem);
  });
});

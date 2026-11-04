import {
  validateIniciarRespostaQuestionario,
  validateResponderQuestionario,
} from './respostaQuestionarioValidators.js';

describe('validateIniciarRespostaQuestionario', () => {
  it('apara questionarioId e usuarioId', () => {
    expect(validateIniciarRespostaQuestionario({ questionarioId: ' q1 ', usuarioId: ' u1 ', extra: 1 })).toEqual({
      questionarioId: 'q1',
      usuarioId: 'u1',
    });
  });

  it.each([
    [{ usuarioId: 'u1' }, 'questionarioId é obrigatório.'],
    [{ questionarioId: 'q1', usuarioId: ' ' }, 'usuarioId é obrigatório.'],
    [null, 'Payload inválido.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateIniciarRespostaQuestionario(payload)).toThrow(mensagem);
  });
});

describe('validateResponderQuestionario', () => {
  it('normaliza resposta de texto sem opções', () => {
    expect(validateResponderQuestionario({ respostas: [{ perguntaId: ' p1 ', textoResposta: ' sim ' }] })).toEqual({
      respostas: [{ perguntaId: 'p1', textoResposta: 'sim', opcaoRespostaIds: [] }],
    });
  });

  it('aceita lista de opções, descartando ids vazios', () => {
    const { respostas } = validateResponderQuestionario({
      respostas: [{ perguntaId: 'p1', opcaoRespostaIds: [' o1 ', '', 'o2'] }],
    });

    expect(respostas[0]).toEqual({ perguntaId: 'p1', textoResposta: '', opcaoRespostaIds: ['o1', 'o2'] });
  });

  it('aceita opção única no campo singular', () => {
    const { respostas } = validateResponderQuestionario({ respostas: [{ perguntaId: 'p1', opcaoRespostaId: ' o1 ' }] });

    expect(respostas[0].opcaoRespostaIds).toEqual(['o1']);
  });

  it('opção única vazia vira lista vazia', () => {
    const { respostas } = validateResponderQuestionario({ respostas: [{ perguntaId: 'p1', opcaoRespostaId: '' }] });

    expect(respostas[0].opcaoRespostaIds).toEqual([]);
  });

  it('a lista tem prioridade sobre o campo singular', () => {
    const { respostas } = validateResponderQuestionario({
      respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o2'], opcaoRespostaId: 'o1' }],
    });

    expect(respostas[0].opcaoRespostaIds).toEqual(['o2']);
  });

  it.each([
    [{}, 'respostas deve ser um array não vazio.'],
    [{ respostas: [] }, 'respostas deve ser um array não vazio.'],
    [{ respostas: ['p1'] }, 'Payload inválido.'],
    [{ respostas: [{ perguntaId: 'p1' }, { textoResposta: 'x' }] }, 'respostas[1].perguntaId é obrigatório.'],
    [{ respostas: [{ perguntaId: 'p1', opcaoRespostaIds: 'o1' }] }, 'opcaoRespostaIds deve ser um array.'],
    [{ respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o1', ' o1'] }] }, 'opcaoRespostaIds não pode conter ids duplicados.'],
    [{ respostas: [{ perguntaId: 'p1' }, { perguntaId: ' p1 ' }] }, 'Não é permitido enviar a mesma pergunta mais de uma vez.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateResponderQuestionario(payload)).toThrow(mensagem);
  });
});

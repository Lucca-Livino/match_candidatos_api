import { validateCreateCandidatura, validateUpdateStatusCandidatura } from '../../../../utils/validators/candidaturaValidators.js';

describe('validateCreateCandidatura', () => {
  it('aceita vagaId e fixa status inscrito e movidoPor sistema', () => {
    expect(validateCreateCandidatura({ vagaId: ' v1 ' })).toEqual({
      vagaId: 'v1',
      movidoPor: 'sistema',
      status: 'inscrito',
    });
  });

  it('ignora o resultado da triagem e o status vindos do cliente', () => {
    const saida = validateCreateCandidatura({
      vagaId: 'v1',
      compativel: true,
      motivoIncompat_: null,
      status: 'aprovado',
      movidoPor: 'candidato',
    });

    expect(saida).toEqual({ vagaId: 'v1', movidoPor: 'sistema', status: 'inscrito' });
  });

  it('recusa vagaId vazio', () => {
    expect(() => validateCreateCandidatura({ vagaId: '   ' })).toThrow('vagaId é obrigatório.');
  });

  it.each([null, undefined, 'v1', ['v1']])('recusa payload %p', (payload) => {
    expect(() => validateCreateCandidatura(payload)).toThrow('Payload inválido.');
  });
});

describe('validateUpdateStatusCandidatura', () => {
  it('normaliza o status e usa sistema como movidoPor padrão', () => {
    expect(validateUpdateStatusCandidatura({ status: ' Em_Analise ' })).toEqual({
      status: 'em_analise',
      movidoPor: 'sistema',
    });
  });

  it('mantém o movidoPor informado', () => {
    expect(validateUpdateStatusCandidatura({ status: 'aprovado', movidoPor: ' recrutador ' })).toEqual({
      status: 'aprovado',
      movidoPor: 'recrutador',
    });
  });

  it('recusa status fora da lista e informa os permitidos', () => {
    expect(() => validateUpdateStatusCandidatura({ status: 'contratado' })).toThrow(
      expect.objectContaining({
        message: 'status inválido.',
        details: { allowed: ['inscrito', 'em_analise', 'aprovado', 'reprovado'] },
      }),
    );
  });

  it('recusa payload que não é objeto', () => {
    expect(() => validateUpdateStatusCandidatura([])).toThrow('Payload inválido.');
  });
});

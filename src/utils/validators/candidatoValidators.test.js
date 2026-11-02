import {
  validateCreateFormacao,
  validateCreateHabilidade,
  validateUpdateHabilidade,
  validateCreateCertificacao,
  validateCreateExperiencia,
} from './candidatoValidators.js';

describe('validateCreateFormacao', () => {
  const base = {
    instituicao: 'ESPM',
    curso: 'Marketing Digital',
    grau: 'pos_graduacao',
    situacao: 'Cursando',
    anoInicio: 2024,
  };

  // Cursando e concluido exigem o ano (previsao ou formatura); trancado e
  // incompleto nao tem ano de conclusao a informar.
  it.each([
    ['ausente', {}],
    ['null', { anoConclusao: null }],
    ['string vazia', { anoConclusao: '' }],
  ])('rejeita formacao cursando com anoConclusao %s', (_, extra) => {
    expect(() => validateCreateFormacao({ ...base, ...extra })).toThrow('previsão de conclusão');
  });

  it('rejeita formacao concluida sem anoConclusao', () => {
    expect(() => validateCreateFormacao({ ...base, situacao: 'concluido' })).toThrow('ano de conclusão');
  });

  it.each(['trancado', 'incompleto'])('aceita formacao %s sem anoConclusao', (situacao) => {
    expect(validateCreateFormacao({ ...base, situacao }).anoConclusao).toBeNull();
  });

  it('normaliza a situacao para minusculas', () => {
    expect(validateCreateFormacao({ ...base, anoConclusao: 2026 }).situacao).toBe('cursando');
  });

  it('rejeita situacao fora da lista', () => {
    expect(() => validateCreateFormacao({ ...base, situacao: 'pausado', anoConclusao: 2026 })).toThrow('situação inválida.');
  });

  it('aceita anoConclusao numerico igual ou posterior ao inicio', () => {
    expect(validateCreateFormacao({ ...base, anoConclusao: 2026 }).anoConclusao).toBe(2026);
  });

  it('rejeita anoConclusao anterior ao inicio', () => {
    expect(() => validateCreateFormacao({ ...base, anoConclusao: 2020 })).toThrow('anoConclusao inválido.');
  });
});

describe('vinculo ao catalogo no perfil', () => {
  it('habilidade aceita itemId opcional', () => {
    expect(validateCreateHabilidade({ habilidade: 'SQL', nivel: 'basico', itemId: 'sql' }))
      .toEqual({ habilidade: 'SQL', nivel: 'basico', itemId: 'sql' });
    expect(validateCreateHabilidade({ habilidade: 'SQL', nivel: 'basico' }))
      .toEqual({ habilidade: 'SQL', nivel: 'basico', itemId: null });
  });

  it('atualizacao pode desfazer o vinculo', () => {
    expect(validateUpdateHabilidade({ itemId: null })).toEqual({ itemId: null });
  });

  it('certificacao aceita itemId', () => {
    expect(validateCreateCertificacao({ nome: 'AWS CCP', emissor: 'AWS', itemId: 'aws' }).itemId).toBe('aws');
  });

  it('formacao aceita areaId', () => {
    const payload = {
      instituicao: 'ESPM', curso: 'Marketing', grau: 'graduacao', situacao: 'concluido', anoInicio: 2018, anoConclusao: 2022,
    };
    expect(validateCreateFormacao({ ...payload, areaId: 'mkt' }).areaId).toBe('mkt');
    expect(validateCreateFormacao(payload).areaId).toBeNull();
  });

  it('experiencia aceita areaId', () => {
    const payload = {
      empresa: 'ACME', cargo: 'Analista', descricaoAtivida_: 'Atendimento ao cliente', dataInicio: '2022-01-01',
    };
    expect(validateCreateExperiencia({ ...payload, areaId: 'atend' }).areaId).toBe('atend');
    expect(validateCreateExperiencia(payload).areaId).toBeNull();
  });
});

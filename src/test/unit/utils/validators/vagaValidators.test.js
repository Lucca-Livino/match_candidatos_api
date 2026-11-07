import { validateCreateVaga, validatePatchVaga, validateListVagaQuery } from '../../../../utils/validators/vagaValidators.js';

const base = (criterio) => ({
  titulo: 'Back-end',
  area: 'TI',
  descricao: 'Desenvolvimento de APIs.',
  criterio_vaga: [{ nome: 'SQL', tipo_criterio: 'skill_tecnica', peso_percentual: 50, ...criterio }],
});

describe('requisito do criterio', () => {
  it('exige requisito quando obrigatorio', () => {
    expect(() => validateCreateVaga(base({ obrigatorio: true }))).toThrow(
      'criterio_vaga[0].requisito é obrigatório para critério obrigatório.',
    );
  });

  it('descarta requisito de criterio nao obrigatorio', () => {
    const v = validateCreateVaga(base({ obrigatorio: false, requisito: { itemId: 'x' } }));
    expect(v.criterio_vaga[0].requisito).toBeUndefined();
  });

  it('habilidade: itemId e nivel opcional', () => {
    const v = validateCreateVaga(base({ obrigatorio: true, requisito: { itemId: 'sql', nivelMinimo: 'intermediario' } }));
    expect(v.criterio_vaga[0].requisito).toEqual({ itemId: 'sql', nivelMinimo: 'intermediario' });
    expect(() => validateCreateVaga(base({ obrigatorio: true, requisito: { itemId: 'sql', nivelMinimo: 'guru' } }))).toThrow('nivelMinimo inválido');
  });

  it('formacao: grau, area ou qualquer, aceitaCursando', () => {
    const v = validateCreateVaga(base({ tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'graduacao', areaId: null, aceitaCursando: true } }));
    expect(v.criterio_vaga[0].requisito).toEqual({ grauMinimo: 'graduacao', areaId: null, aceitaCursando: true });
    expect(() => validateCreateVaga(base({ tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'x' } }))).toThrow('grauMinimo inválido');
  });

  it('experiencia: area e meses inteiros nao negativos', () => {
    const v = validateCreateVaga(base({ tipo_criterio: 'experiencia', obrigatorio: true, requisito: { areaId: 'atend', mesesMinimos: 12 } }));
    expect(v.criterio_vaga[0].requisito).toEqual({ areaId: 'atend', mesesMinimos: 12 });
    expect(() => validateCreateVaga(base({ tipo_criterio: 'experiencia', obrigatorio: true, requisito: { areaId: 'atend', mesesMinimos: -1 } }))).toThrow('mesesMinimos inválido');
  });

  it('certificacao e habilidade exigem itemId', () => {
    expect(() => validateCreateVaga(base({ tipo_criterio: 'certificacao', obrigatorio: true, requisito: {} }))).toThrow('itemId é obrigatório');
  });

  it('aceitaCursando e mesesMinimos precisam ter tipo valido', () => {
    const exp = (requisito) => base({ tipo_criterio: 'experiencia', obrigatorio: true, requisito });
    expect(() => validateCreateVaga(base({ tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'graduacao', aceitaCursando: 'sim' } }))).toThrow('aceitaCursando deve ser booleano');
    expect(() => validateCreateVaga(exp({ areaId: 'a', mesesMinimos: true }))).toThrow('mesesMinimos inválido');
    expect(() => validateCreateVaga(exp({ areaId: 'a', mesesMinimos: [] }))).toThrow('mesesMinimos inválido');
    expect(() => validateCreateVaga(exp({ areaId: 'a', mesesMinimos: null }))).toThrow('mesesMinimos inválido');
    expect(validateCreateVaga(exp({ areaId: 'a', mesesMinimos: '12' })).criterio_vaga[0].requisito.mesesMinimos).toBe(12);
    expect(validateCreateVaga(exp({ areaId: 'a' })).criterio_vaga[0].requisito.mesesMinimos).toBe(0);
  });
});

describe('requisito do critério — demais casos', () => {
  const obrigatorio = (tipo_criterio, requisito) => base({ tipo_criterio, obrigatorio: true, requisito });
  const requisito = (payload) => validateCreateVaga(payload).criterio_vaga[0].requisito;

  it.each([
    ['array', []],
    ['texto', 'sql'],
    ['null', null],
  ])('recusa requisito %s', (_, valor) => {
    expect(() => validateCreateVaga(obrigatorio('skill_tecnica', valor))).toThrow(
      'criterio_vaga[0].requisito é obrigatório para critério obrigatório.',
    );
  });

  it('habilidade: apara o itemId e dispensa nivelMinimo vazio', () => {
    expect(requisito(obrigatorio('skill_tecnica', { itemId: ' sql ', nivelMinimo: ' ' }))).toEqual({ itemId: 'sql' });
    expect(requisito(obrigatorio('skill_tecnica', { itemId: 'sql', nivelMinimo: null }))).toEqual({ itemId: 'sql' });
  });

  it.each(['Intermediario', ' intermediario ', 'INTERMEDIARIO'])('habilidade: normaliza nivelMinimo %p', (nivelMinimo) => {
    expect(requisito(obrigatorio('skill_tecnica', { itemId: 'sql', nivelMinimo }))).toEqual({
      itemId: 'sql',
      nivelMinimo: 'intermediario',
    });
  });

  it('informa os níveis permitidos quando nivelMinimo é inválido', () => {
    expect(() => validateCreateVaga(obrigatorio('skill_tecnica', { itemId: 'sql', nivelMinimo: 'guru' }))).toThrow(
      expect.objectContaining({
        statusCode: 400,
        details: { allowed: ['basico', 'intermediario', 'avancado', 'especialista'] },
      }),
    );
  });

  it.each([
    [{ itemId: null }],
    [{ itemId: ' ' }],
  ])('habilidade recusa itemId vazio %j', (valor) => {
    expect(() => validateCreateVaga(obrigatorio('skill_tecnica', valor))).toThrow('criterio_vaga[0].requisito.itemId é obrigatório.');
  });

  it('formação: área opcional e aceitaCursando falso por padrão', () => {
    expect(requisito(obrigatorio('formacao', { grauMinimo: 'mestrado' }))).toEqual({
      grauMinimo: 'mestrado', areaId: null, aceitaCursando: false,
    });
    expect(requisito(obrigatorio('formacao', { grauMinimo: 'mestrado', areaId: ' dir ', aceitaCursando: false }))).toEqual({
      grauMinimo: 'mestrado', areaId: 'dir', aceitaCursando: false,
    });
  });

  it('informa os graus permitidos quando grauMinimo é inválido', () => {
    expect(() => validateCreateVaga(obrigatorio('formacao', {}))).toThrow(
      expect.objectContaining({ details: { allowed: ['tecnico', 'graduacao', 'pos_graduacao', 'mestrado', 'doutorado'] } }),
    );
  });

  it('experiência: aceita meses em texto com espaços e o limite de 600', () => {
    expect(requisito(obrigatorio('experiencia', { areaId: 'ti', mesesMinimos: ' 24 ' }))).toEqual({ areaId: 'ti', mesesMinimos: 24 });
    expect(requisito(obrigatorio('experiencia', { areaId: 'ti', mesesMinimos: 600 }))).toEqual({ areaId: 'ti', mesesMinimos: 600 });
  });

  it.each([
    [{ areaId: 'ti', mesesMinimos: 601 }, 'criterio_vaga[0].requisito.mesesMinimos inválido.'],
    [{ areaId: 'ti', mesesMinimos: 1.5 }, 'criterio_vaga[0].requisito.mesesMinimos inválido.'],
    [{ areaId: 'ti', mesesMinimos: Number.NaN }, 'criterio_vaga[0].requisito.mesesMinimos inválido.'],
    [{ areaId: 'ti', mesesMinimos: '1.5' }, 'criterio_vaga[0].requisito.mesesMinimos inválido.'],
    [{ areaId: 'ti', mesesMinimos: '' }, 'criterio_vaga[0].requisito.mesesMinimos inválido.'],
    [{ mesesMinimos: 12 }, 'criterio_vaga[0].requisito.areaId é obrigatório.'],
  ])('experiência recusa %j', (valor, mensagem) => {
    expect(() => validateCreateVaga(obrigatorio('experiencia', valor))).toThrow(mensagem);
  });

  it('certificação: exige só o itemId', () => {
    expect(requisito(obrigatorio('certificacao', { itemId: 'aws', nivelMinimo: 'basico' }))).toEqual({ itemId: 'aws' });
  });
});

describe('validateCreateVaga', () => {
  const valida = { titulo: ' Analista ', area: ' rh ', descricao: ' Recrutamento e seleção. ' };

  it('normaliza os campos, nasce pausada e ignora o status enviado', () => {
    expect(validateCreateVaga({ ...valida, status: 'ativa', requisitos_gerais: ' Inglês ' })).toEqual({
      area: 'RH',
      titulo: 'Analista',
      descricao: 'Recrutamento e seleção.',
      requisitos_gerais: 'Inglês',
      status: 'pausada',
      criterio_vaga: [],
    });
  });

  it.each([
    ['ausente', {}],
    ['null', { requisitos_gerais: null }],
  ])('usa requisitos_gerais vazio quando %s', (_, extra) => {
    expect(validateCreateVaga({ ...valida, ...extra }).requisitos_gerais).toBe('');
  });

  it('normaliza os critérios e mantém a descrição quando enviada', () => {
    expect(validateCreateVaga({
      ...valida,
      criterio_vaga: [
        { nome: ' Excel ', tipo_criterio: ' SKILL_TECNICA ', peso_percentual: '60', descricao: ' planilhas ' },
        { nome: 'Inglês', tipo_criterio: 'certificacao', peso_percentual: 40, descricao: null },
      ],
    }).criterio_vaga).toEqual([
      { nome: 'Excel', tipo_criterio: 'skill_tecnica', peso_percentual: 60, obrigatorio: false, descricao: 'planilhas' },
      { nome: 'Inglês', tipo_criterio: 'certificacao', peso_percentual: 40, obrigatorio: false, descricao: '' },
    ]);
  });

  const criterio = { nome: 'SQL', tipo_criterio: 'skill_tecnica', peso_percentual: 50 };

  it.each([
    [null, 'Payload inválido.'],
    [[], 'Payload inválido.'],
    [{ ...valida, titulo: undefined }, 'título é obrigatório e deve ter ao menos 3 caracteres.'],
    [{ ...valida, titulo: ' AB ' }, 'título é obrigatório e deve ter ao menos 3 caracteres.'],
    [{ ...valida, descricao: undefined }, 'descrição é obrigatória e deve ter ao menos 10 caracteres.'],
    [{ ...valida, descricao: 'curta' }, 'descrição é obrigatória e deve ter ao menos 10 caracteres.'],
    [{ ...valida, area: undefined }, 'área inválida.'],
    [{ ...valida, area: 'saude' }, 'área inválida.'],
    [{ ...valida, criterio_vaga: null }, 'criterio_vaga deve ser um array.'],
    [{ ...valida, criterio_vaga: {} }, 'criterio_vaga deve ser um array.'],
    [{ ...valida, criterio_vaga: [null] }, 'Payload inválido.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, nome: undefined }] }, 'criterio_vaga[0].nome deve ter ao menos 2 caracteres.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, nome: 'S' }] }, 'criterio_vaga[0].nome deve ter ao menos 2 caracteres.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, tipo_criterio: undefined }] }, 'criterio_vaga[0].tipo_criterio inválido.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, tipo_criterio: 'idioma' }] }, 'criterio_vaga[0].tipo_criterio inválido.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, peso_percentual: undefined }] }, 'criterio_vaga[0].peso_percentual deve ser número entre 1 e 100.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, peso_percentual: 0 }] }, 'criterio_vaga[0].peso_percentual deve ser número entre 1 e 100.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, peso_percentual: 0.5 }] }, 'criterio_vaga[0].peso_percentual deve ser número entre 1 e 100.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, peso_percentual: 101 }] }, 'criterio_vaga[0].peso_percentual deve ser número entre 1 e 100.'],
    [{ ...valida, criterio_vaga: [{ ...criterio, obrigatorio: 'sim' }] }, 'criterio_vaga[0].obrigatorio deve ser booleano.'],
    [
      { ...valida, criterio_vaga: [criterio, { ...criterio, nome: 'Excel', peso_percentual: 51 }] },
      'A soma de peso_percentual em criterio_vaga não pode ultrapassar 100.',
    ],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateVaga(payload)).toThrow(mensagem);
  });

  it('informa os valores permitidos para área e tipo_criterio', () => {
    expect(() => validateCreateVaga({ ...valida, area: 'saude' })).toThrow(
      expect.objectContaining({ statusCode: 400, details: { allowed: expect.arrayContaining(['TI', 'RH', 'OUTROS']) } }),
    );
    expect(() => validateCreateVaga({ ...valida, criterio_vaga: [{ ...criterio, tipo_criterio: 'idioma' }] })).toThrow(
      expect.objectContaining({ details: { allowed: ['skill_tecnica', 'formacao', 'experiencia', 'certificacao'] } }),
    );
  });

  it('aceita soma de pesos igual a 100', () => {
    expect(validateCreateVaga({ ...valida, criterio_vaga: [criterio, { ...criterio, nome: 'Excel' }] }).criterio_vaga).toHaveLength(2);
  });
});

describe('validatePatchVaga', () => {
  it('devolve só os campos informados, normalizados', () => {
    expect(validatePatchVaga({
      area: 'ti',
      titulo: ' Dev ',
      descricao: ' Desenvolvimento web. ',
      requisitos_gerais: ' Git ',
      status: ' ATIVA ',
      criterio_vaga: [],
    })).toEqual({
      area: 'TI',
      titulo: 'Dev',
      descricao: 'Desenvolvimento web.',
      requisitos_gerais: 'Git',
      status: 'ativa',
      criterio_vaga: [],
    });
  });

  it('aceita limpar requisitos_gerais', () => {
    expect(validatePatchVaga({ requisitos_gerais: null })).toEqual({ requisitos_gerais: '' });
  });

  it.each([
    [null, 'Payload inválido.'],
    [{}, 'Informe ao menos um campo para atualizar.'],
    [{ id: 'v1' }, 'Nenhum campo válido foi informado para atualização.'],
    [{ area: 'x' }, 'área inválida.'],
    [{ titulo: null }, 'título deve ter ao menos 3 caracteres.'],
    [{ titulo: 'ab' }, 'título deve ter ao menos 3 caracteres.'],
    [{ descricao: null }, 'descrição deve ter ao menos 10 caracteres.'],
    [{ descricao: 'curta' }, 'descrição deve ter ao menos 10 caracteres.'],
    [{ status: null }, 'status inválido.'],
    [{ status: 'encerrada' }, 'status inválido.'],
    [{ criterio_vaga: 'x' }, 'criterio_vaga deve ser um array.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validatePatchVaga(payload)).toThrow(mensagem);
  });

  it('informa os status permitidos quando o status é inválido', () => {
    expect(() => validatePatchVaga({ status: 'encerrada' })).toThrow(
      expect.objectContaining({ details: { allowed: ['ativa', 'pausada', 'arquivada'] } }),
    );
  });
});

describe('validateListVagaQuery', () => {
  it('usa página 1, limite 10 e nenhum filtro por padrão', () => {
    expect(validateListVagaQuery()).toEqual({
      page: 1, limit: 10, titulo: undefined, area: undefined, status: undefined, tipo_criterio: undefined,
    });
  });

  it('normaliza os filtros válidos', () => {
    expect(validateListVagaQuery({
      page: '3', limit: '100', titulo: ' Dev ', area: ' ti ', status: ' ATIVA ', tipo_criterio: ' Formacao ',
    })).toEqual({
      page: 3, limit: 100, titulo: 'Dev', area: 'TI', status: 'ativa', tipo_criterio: 'formacao',
    });
  });

  it('descarta filtros fora das listas permitidas', () => {
    expect(validateListVagaQuery({ area: 'saude', status: 'encerrada', tipo_criterio: 'idioma' })).toEqual(
      expect.objectContaining({ area: undefined, status: undefined, tipo_criterio: undefined }),
    );
  });

  it.each([
    [{ page: '0', limit: '0' }],
    [{ page: 'x', limit: 'x' }],
    [{ page: '-2', limit: '101' }],
  ])('volta aos padrões com paginação inválida %j', (query) => {
    expect(validateListVagaQuery(query)).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
  });
});

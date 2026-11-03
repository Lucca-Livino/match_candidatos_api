import {
  validateCreateCandidato,
  validateUpdateCandidato,
  validateListCandidatoQuery,
  validarAnoConclusaoPorSituacao,
  validateCreateFormacao,
  validateUpdateFormacao,
  validateCreateHabilidade,
  validateUpdateHabilidade,
  validateCreateCertificacao,
  validateUpdateCertificacao,
  validateCreateExperiencia,
  validateUpdateExperiencia,
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

describe('validateCreateCandidato', () => {
  const valido = { nome: ' Ana ', email: ' ANA@Mail.com ', senha: ' 12345678 ' };

  it('normaliza os campos informados', () => {
    expect(validateCreateCandidato({ ...valido, estado: ' sp ', cidade: ' Santos ', telefone: ' 1199 ', linkedin: ' in/ana ' })).toEqual({
      nome: 'Ana',
      email: 'ana@mail.com',
      senha: '12345678',
      telefone: '1199',
      linkedin: 'in/ana',
      cidade: 'Santos',
      estado: 'SP',
    });
  });

  it('preenche os campos opcionais ausentes com string vazia', () => {
    expect(validateCreateCandidato(valido)).toEqual({
      nome: 'Ana', email: 'ana@mail.com', senha: '12345678', telefone: '', linkedin: '', cidade: '', estado: '',
    });
  });

  it.each([
    [null, 'Payload inválido.'],
    ['texto', 'Payload inválido.'],
    [[], 'Payload inválido.'],
    [{ ...valido, nome: undefined }, 'nome deve ter ao menos 2 caracteres.'],
    [{ ...valido, nome: ' A ' }, 'nome deve ter ao menos 2 caracteres.'],
    [{ ...valido, email: undefined }, 'e-mail inválido.'],
    [{ ...valido, email: 'ana@mail' }, 'e-mail inválido.'],
    [{ ...valido, senha: undefined }, 'senha deve ter ao menos 8 caracteres.'],
    [{ ...valido, senha: ' 1234567 ' }, 'senha deve ter ao menos 8 caracteres.'],
    [{ ...valido, estado: 'SPA' }, 'estado deve conter 2 caracteres.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateCandidato(payload)).toThrow(mensagem);
  });

  it('usa statusCode 400 e código VALIDATION_ERROR', () => {
    expect(() => validateCreateCandidato(null)).toThrow(
      expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' }),
    );
  });
});

describe('validateUpdateCandidato', () => {
  it('devolve só os campos informados', () => {
    expect(validateUpdateCandidato({ cidade: ' Recife ', estado: 'pe' })).toEqual({ cidade: 'Recife', estado: 'PE' });
  });

  it('aceita limpar os campos opcionais', () => {
    expect(validateUpdateCandidato({ telefone: null, linkedin: null, cidade: null, estado: null })).toEqual({
      telefone: '', linkedin: '', cidade: '', estado: '',
    });
  });

  it.each([
    [{}, 'Informe ao menos um campo para atualizar.'],
    [{ nome: '' }, 'nome deve ter ao menos 2 caracteres.'],
    [{ email: 'x' }, 'e-mail inválido.'],
    [{ senha: 'curta' }, 'senha deve ter ao menos 8 caracteres.'],
    [{ estado: 'S' }, 'estado deve conter 2 caracteres.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateCandidato(payload)).toThrow(mensagem);
  });
});

describe('validateListCandidatoQuery', () => {
  it('usa página 1 e limite 10 por padrão', () => {
    expect(validateListCandidatoQuery()).toEqual({
      page: 1, limit: 10, cidade: undefined, estado: undefined, nome: undefined,
    });
  });

  it('normaliza os filtros informados', () => {
    expect(validateListCandidatoQuery({ page: '2', limit: '50', cidade: ' Natal ', estado: ' rn ', nome: ' Ana ' })).toEqual({
      page: 2, limit: 50, cidade: 'Natal', estado: 'RN', nome: 'Ana',
    });
  });

  it.each([
    [{ page: '0', limit: '0' }],
    [{ page: 'x', limit: 'x' }],
    [{ page: '-1', limit: '101' }],
  ])('volta aos padrões com paginação inválida %j', (query) => {
    expect(validateListCandidatoQuery(query)).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
  });
});

describe('validarAnoConclusaoPorSituacao', () => {
  it('aceita situação que não exige ano de conclusão', () => {
    expect(() => validarAnoConclusaoPorSituacao('trancado', null)).not.toThrow();
  });

  it('aceita cursando com previsão de conclusão', () => {
    expect(() => validarAnoConclusaoPorSituacao('cursando', 2027)).not.toThrow();
  });
});

describe('validateCreateFormacao — validações', () => {
  const valida = {
    instituicao: ' USP ', curso: ' Direito ', grau: ' GRADUACAO ', situacao: 'concluido', anoInicio: '2015', anoConclusao: '2020',
  };

  it('normaliza os campos', () => {
    expect(validateCreateFormacao(valida)).toEqual({
      instituicao: 'USP',
      curso: 'Direito',
      grau: 'graduacao',
      situacao: 'concluido',
      anoInicio: 2015,
      anoConclusao: 2020,
      areaId: null,
    });
  });

  it.each([
    [null, 'Payload inválido.'],
    [{ ...valida, instituicao: undefined }, 'instituição, curso e situação são obrigatórios.'],
    [{ ...valida, curso: undefined }, 'instituição, curso e situação são obrigatórios.'],
    [{ ...valida, curso: ' ' }, 'instituição, curso e situação são obrigatórios.'],
    [{ ...valida, situacao: undefined }, 'instituição, curso e situação são obrigatórios.'],
    [{ ...valida, grau: undefined }, 'grau inválido.'],
    [{ ...valida, anoInicio: 1899 }, 'anoInicio inválido.'],
    [{ ...valida, anoInicio: 2015.5 }, 'anoInicio inválido.'],
    [{ ...valida, anoConclusao: 'abc' }, 'anoConclusao inválido.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateFormacao(payload)).toThrow(mensagem);
  });

  it('informa os graus permitidos quando o grau é inválido', () => {
    expect(() => validateCreateFormacao({ ...valida, grau: 'x' })).toThrow(
      expect.objectContaining({
        statusCode: 400,
        details: { allowed: ['tecnico', 'graduacao', 'pos_graduacao', 'mestrado', 'doutorado'] },
      }),
    );
  });

  it('informa as situações permitidas quando a situação é inválida', () => {
    expect(() => validateCreateFormacao({ ...valida, situacao: 'x' })).toThrow(
      expect.objectContaining({ details: { allowed: ['cursando', 'concluido', 'trancado', 'incompleto'] } }),
    );
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string vazia', ''],
    ['só com espaços', '  '],
  ])('trata areaId %s como sem vínculo', (_, areaId) => {
    expect(validateCreateFormacao({ ...valida, areaId }).areaId).toBeNull();
  });

  it('apara o areaId informado', () => {
    expect(validateCreateFormacao({ ...valida, areaId: ' dir ' }).areaId).toBe('dir');
  });
});

describe('validateUpdateFormacao', () => {
  it('devolve só os campos informados, normalizados', () => {
    expect(validateUpdateFormacao({
      instituicao: ' USP ',
      curso: ' Direito ',
      grau: 'MESTRADO',
      situacao: ' Trancado ',
      anoInicio: '2018',
      anoConclusao: '2020',
      areaId: ' dir ',
    })).toEqual({
      instituicao: 'USP',
      curso: 'Direito',
      grau: 'mestrado',
      situacao: 'trancado',
      anoInicio: 2018,
      anoConclusao: 2020,
      areaId: 'dir',
    });
  });

  it.each([null, ''])('aceita limpar anoConclusao com %j', (anoConclusao) => {
    expect(validateUpdateFormacao({ anoConclusao })).toEqual({ anoConclusao: null });
  });

  it('aceita anoConclusao sem anoInicio no mesmo payload', () => {
    expect(validateUpdateFormacao({ anoConclusao: 2010 })).toEqual({ anoConclusao: 2010 });
  });

  it('aceita anoConclusao igual ao anoInicio', () => {
    expect(validateUpdateFormacao({ anoInicio: 2020, anoConclusao: 2020 })).toEqual({ anoInicio: 2020, anoConclusao: 2020 });
  });

  it.each([
    [[], 'Payload inválido.'],
    [{}, 'Informe ao menos um campo para atualizar.'],
    [{ instituicao: null }, 'instituição inválida.'],
    [{ curso: null }, 'curso inválido.'],
    [{ curso: ' ' }, 'curso inválido.'],
    [{ grau: null }, 'grau inválido.'],
    [{ situacao: null }, 'situação inválida.'],
    [{ anoInicio: 'abc' }, 'anoInicio inválido.'],
    [{ anoInicio: 1800 }, 'anoInicio inválido.'],
    [{ anoConclusao: 1800 }, 'anoConclusao inválido.'],
    [{ anoConclusao: 2020.5 }, 'anoConclusao inválido.'],
    [{ anoInicio: 2020, anoConclusao: 2019 }, 'anoConclusao não pode ser menor que anoInicio.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateFormacao(payload)).toThrow(mensagem);
  });
});

describe('validateCreateExperiencia — validações', () => {
  const valida = {
    empresa: ' ACME ', cargo: ' Analista ', descricaoAtivida_: ' Suporte ', dataInicio: '2022-01-01', dataFim: '2023-01-01',
  };

  it('normaliza os campos e converte as datas', () => {
    expect(validateCreateExperiencia(valida)).toEqual({
      empresa: 'ACME',
      cargo: 'Analista',
      descricaoAtivida_: 'Suporte',
      dataInicio: new Date('2022-01-01'),
      dataFim: new Date('2023-01-01'),
      areaId: null,
    });
  });

  it.each([null, ''])('aceita dataFim %j como experiência atual', (dataFim) => {
    expect(validateCreateExperiencia({ ...valida, dataFim }).dataFim).toBeNull();
  });

  it.each([
    [null, 'Payload inválido.'],
    [{ ...valida, empresa: undefined }, 'empresa, cargo e descrição das atividades são obrigatórios.'],
    [{ ...valida, cargo: '' }, 'empresa, cargo e descrição das atividades são obrigatórios.'],
    [{ ...valida, descricaoAtivida_: undefined }, 'empresa, cargo e descrição das atividades são obrigatórios.'],
    [{ ...valida, dataInicio: undefined }, 'dataInicio é obrigatória.'],
    [{ ...valida, dataInicio: 'ontem' }, 'dataInicio inválida.'],
    [{ ...valida, dataFim: 'amanhã' }, 'dataFim inválida.'],
    [{ ...valida, dataFim: '2021-12-31' }, 'dataFim não pode ser anterior a dataInicio.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateExperiencia(payload)).toThrow(mensagem);
  });
});

describe('validateUpdateExperiencia', () => {
  it('devolve só os campos informados, normalizados', () => {
    expect(validateUpdateExperiencia({
      empresa: ' ACME ', cargo: ' Dev ', descricaoAtivida_: ' APIs ', dataInicio: '2022-01-01', dataFim: '2023-01-01', areaId: 'ti',
    })).toEqual({
      empresa: 'ACME',
      cargo: 'Dev',
      descricaoAtivida_: 'APIs',
      dataInicio: new Date('2022-01-01'),
      dataFim: new Date('2023-01-01'),
      areaId: 'ti',
    });
  });

  it('aceita limpar dataFim e o vínculo', () => {
    expect(validateUpdateExperiencia({ dataFim: null, areaId: '' })).toEqual({ dataFim: null, areaId: null });
  });

  it.each([
    ['texto', 'Payload inválido.'],
    [{}, 'Informe ao menos um campo para atualizar.'],
    [{ empresa: null }, 'empresa inválida.'],
    [{ cargo: null }, 'cargo inválido.'],
    [{ cargo: ' ' }, 'cargo inválido.'],
    [{ descricaoAtivida_: undefined }, 'descrição das atividades inválida.'],
    [{ dataInicio: null }, 'dataInicio é obrigatória.'],
    [{ dataInicio: 'x' }, 'dataInicio inválida.'],
    [{ dataFim: 'x' }, 'dataFim inválida.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateExperiencia(payload)).toThrow(mensagem);
  });
});

describe('validateCreateHabilidade — validações', () => {
  it('normaliza habilidade e nível', () => {
    expect(validateCreateHabilidade({ habilidade: ' Excel ', nivel: ' AVANCADO ' })).toEqual({
      habilidade: 'Excel', nivel: 'avancado', itemId: null,
    });
  });

  it.each([
    [null, 'Payload inválido.'],
    [{ nivel: 'basico' }, 'habilidade é obrigatória.'],
    [{ habilidade: 'Excel' }, 'nível inválido.'],
    [{ habilidade: 'Excel', nivel: 'guru' }, 'nível inválido.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateHabilidade(payload)).toThrow(mensagem);
  });

  it('informa os níveis permitidos quando o nível é inválido', () => {
    expect(() => validateCreateHabilidade({ habilidade: 'Excel', nivel: 'guru' })).toThrow(
      expect.objectContaining({ details: { allowed: ['basico', 'intermediario', 'avancado', 'especialista'] } }),
    );
  });
});

describe('validateUpdateHabilidade — validações', () => {
  it('devolve só os campos informados, normalizados', () => {
    expect(validateUpdateHabilidade({ habilidade: ' Excel ', nivel: 'ESPECIALISTA', itemId: ' excel ' })).toEqual({
      habilidade: 'Excel', nivel: 'especialista', itemId: 'excel',
    });
  });

  it.each([
    [[], 'Payload inválido.'],
    [{}, 'Informe ao menos um campo para atualizar.'],
    [{ habilidade: null }, 'habilidade inválida.'],
    [{ nivel: null }, 'nível inválido.'],
    [{ nivel: 'guru' }, 'nível inválido.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateHabilidade(payload)).toThrow(mensagem);
  });
});

describe('validateCreateCertificacao — validações', () => {
  it('normaliza os campos e converte as datas', () => {
    expect(validateCreateCertificacao({
      nome: ' CCP ', emissor: ' AWS ', codigo: ' ABC ', dataEmissao: '2024-01-01', dataExpiracao: '2027-01-01',
    })).toEqual({
      nome: 'CCP',
      emissor: 'AWS',
      codigo: 'ABC',
      dataEmissao: new Date('2024-01-01'),
      dataExpiracao: new Date('2027-01-01'),
      itemId: null,
    });
  });

  it('usa valores vazios para os campos opcionais ausentes', () => {
    expect(validateCreateCertificacao({ nome: 'CCP', emissor: 'AWS' })).toEqual({
      nome: 'CCP', emissor: 'AWS', codigo: '', dataEmissao: null, dataExpiracao: null, itemId: null,
    });
  });

  it.each([
    [null, 'Payload inválido.'],
    [{ emissor: 'AWS' }, 'nome e emissor são obrigatórios.'],
    [{ nome: 'CCP' }, 'nome e emissor são obrigatórios.'],
    [{ nome: 'CCP', emissor: 'AWS', dataEmissao: 'x' }, 'dataEmissao inválida.'],
    [{ nome: 'CCP', emissor: 'AWS', dataExpiracao: 'x' }, 'dataExpiracao inválida.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateCreateCertificacao(payload)).toThrow(mensagem);
  });
});

describe('validateUpdateCertificacao', () => {
  it('devolve só os campos informados, normalizados', () => {
    expect(validateUpdateCertificacao({
      nome: ' CCP ', emissor: ' AWS ', codigo: ' ABC ', dataEmissao: '2024-01-01', dataExpiracao: '2027-01-01', itemId: 'aws',
    })).toEqual({
      nome: 'CCP',
      emissor: 'AWS',
      codigo: 'ABC',
      dataEmissao: new Date('2024-01-01'),
      dataExpiracao: new Date('2027-01-01'),
      itemId: 'aws',
    });
  });

  it('aceita limpar os campos opcionais', () => {
    expect(validateUpdateCertificacao({ codigo: null, dataEmissao: '', dataExpiracao: null, itemId: null })).toEqual({
      codigo: '', dataEmissao: null, dataExpiracao: null, itemId: null,
    });
  });

  it.each([
    [null, 'Payload inválido.'],
    [{}, 'Informe ao menos um campo para atualizar.'],
    [{ nome: null }, 'nome inválido.'],
    [{ emissor: null }, 'emissor inválido.'],
    [{ emissor: ' ' }, 'emissor inválido.'],
    [{ dataEmissao: 'x' }, 'dataEmissao inválida.'],
    [{ dataExpiracao: 'x' }, 'dataExpiracao inválida.'],
  ])('recusa %j', (payload, mensagem) => {
    expect(() => validateUpdateCertificacao(payload)).toThrow(mensagem);
  });
});

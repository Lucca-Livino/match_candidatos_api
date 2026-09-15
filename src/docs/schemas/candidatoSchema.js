const Candidato = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67f11111f7f6a0f123456700' },
    id: { type: 'string', example: 'cand-001' },
    nome: { type: 'string', example: 'Joao Silva' },
    email: { type: 'string', format: 'email', example: 'joao.silva@email.com' },
    telefone: { type: 'string', example: '(11) 99999-9999' },
    linkedin: { type: 'string', example: 'https://www.linkedin.com/in/joao-silva' },
    cidade: { type: 'string', example: 'Sao Paulo' },
    estado: { type: 'string', example: 'SP' },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
  },
};

const Formacao = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    id: { type: 'string', example: 'form-001' },
    usuarioId: { type: 'string', example: 'user-001' },
    instituicao: { type: 'string', example: 'USP' },
    curso: { type: 'string', example: 'Engenharia de Software' },
    grau: { type: 'string', enum: ['tecnico', 'graduação', 'pos_graduação', 'mestrado', 'doutorado'] },
    situacao: { type: 'string', example: 'concluido' },
    anoInicio: { type: 'integer', example: 2018 },
    anoConclusao: { type: 'integer', nullable: true, example: 2022 },
  },
};

const Experiencia = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    id: { type: 'string', example: 'exp-001' },
    usuarioId: { type: 'string', example: 'user-001' },
    empresa: { type: 'string', example: 'Empresa XPTO' },
    cargo: { type: 'string', example: 'Backend Developer' },
    descricaoAtivida_: { type: 'string', example: 'Desenvolvimento de APIs REST com Node.js' },
    dataInicio: { type: 'string', format: 'date-time' },
    dataFim: { type: 'string', format: 'date-time', nullable: true },
    mesesDuracao: { type: 'integer', example: 24 },
  },
};

const Habilidade = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    id: { type: 'string', example: 'hab-001' },
    usuarioId: { type: 'string', example: 'user-001' },
    habilidade: { type: 'string', example: 'Node.js' },
    nivel: { type: 'string', enum: ['basico', 'intermediario', 'avancado', 'especialista'] },
  },
};

const Certificacao = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    id: { type: 'string', example: 'cert-001' },
    usuarioId: { type: 'string', example: 'user-001' },
    nome: { type: 'string', example: 'AWS Certified Cloud Practitioner' },
    emissor: { type: 'string', example: 'Amazon' },
    dataEmissao: { type: 'string', format: 'date-time', nullable: true },
    dataExpiracao: { type: 'string', format: 'date-time', nullable: true },
    codigo: { type: 'string', example: 'AWS-123' },
    expirada: { type: 'boolean', example: false },
  },
};

const Candidatura = {
  type: 'object',
  description:
    'Candidatura. Os campos da triagem por IA sao escritos pelo servidor, nunca pelo cliente. ' +
    '`scoreIA` e `limiteAplicado` existem no banco como registro de auditoria e NAO saem por ' +
    'esta API: expor o numero devolveria o ranking que a triagem sem ordenacao evita.',
  properties: {
    _id: { type: 'string' },
    id: { type: 'string', example: 'candv-001' },
    usuarioId: { type: 'string', example: 'user-001' },
    vagaId: { type: 'string', example: 'vaga-001' },
    compativel: {
      type: 'integer',
      enum: [0, 1],
      description:
        'Resultado da triagem: 1 = apto, 0 = nao apto. Enquanto avaliadoEm for null carrega o ' +
        'default do schema (1) e nao representa uma avaliacao.',
      example: 1,
    },
    motivoIncompat_: {
      type: 'string',
      description: 'Preenchido pela triagem apenas quando compativel = 0.',
      example: '',
    },
    justificativa: {
      type: 'string',
      description: 'Texto da analise por IA. Vazio enquanto a candidatura nao foi avaliada.',
      example: 'Atende os criterios de maior peso; experiencia com Node.js comprovada.',
    },
    versaoModelo: {
      type: 'string',
      nullable: true,
      description: 'Modelo da cascata que produziu a avaliacao.',
      example: 'gemini-3.1-flash-lite',
    },
    avaliadoEm: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description:
        'null enquanto a candidatura nao passou pela triagem (IA indisponivel ou desligada). ' +
        'E o campo que distingue "sem avaliacao" de "avaliada como apta".',
    },
    status: { type: 'string', enum: ['inscrito', 'em_analise', 'aprovado', 'reprovado'], example: 'inscrito' },
    movidoPor: { type: 'string', example: 'sistema' },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
  },
};

const candidatoSchemas = {
  Candidato,
  Formacao,
  Experiencia,
  Habilidade,
  Certificacao,
  Candidatura,

  CandidatoCreateRequest: {
    type: 'object',
    required: ['nome', 'email'],
    properties: {
      nome: { type: 'string', example: 'Joao Silva' },
      email: { type: 'string', format: 'email', example: 'joao.silva@email.com' },
      telefone: { type: 'string', example: '(11) 99999-9999' },
      linkedin: { type: 'string', example: 'https://www.linkedin.com/in/joao-silva' },
      cidade: { type: 'string', example: 'Sao Paulo' },
      estado: { type: 'string', example: 'SP' },
    },
  },

  CandidatoUpdateRequest: {
    type: 'object',
    properties: {
      nome: { type: 'string', example: 'Joao da Silva' },
      email: { type: 'string', format: 'email', example: 'joao.silva2@email.com' },
      telefone: { type: 'string' },
      linkedin: { type: 'string' },
      cidade: { type: 'string' },
      estado: { type: 'string' },
    },
  },

  CandidatoSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidato criado com sucesso.' },
      data: { $ref: '#/components/schemas/Candidato' },
    },
  },

  CandidatoCompleto: {
    allOf: [
      { $ref: '#/components/schemas/Candidato' },
      {
        type: 'object',
        properties: {
          formacao: { type: 'array', items: { $ref: '#/components/schemas/Formacao' } },
          experiencia: { type: 'array', items: { $ref: '#/components/schemas/Experiencia' } },
          habilidade: { type: 'array', items: { $ref: '#/components/schemas/Habilidade' } },
          certificacao: { type: 'array', items: { $ref: '#/components/schemas/Certificacao' } },
        },
      },
    ],
  },

  CandidatoCompletoResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidato encontrado com sucesso.' },
      data: { $ref: '#/components/schemas/CandidatoCompleto' },
    },
  },

  CandidatoListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidatos listados com sucesso.' },
      data: {
        type: 'object',
        properties: {
          docs: { type: 'array', items: { $ref: '#/components/schemas/Candidato' } },
          totalDocs: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalPages: { type: 'integer', example: 1 },
          page: { type: 'integer', example: 1 },
          pagingCounter: { type: 'integer', example: 1 },
          hasPrevPage: { type: 'boolean', example: false },
          hasNextPage: { type: 'boolean', example: false },
          prevPage: { type: 'integer', nullable: true, example: null },
          nextPage: { type: 'integer', nullable: true, example: null },
        },
      },
    },
  },

  CandidatoDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidato excluido com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cand-001' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },

  FormacaoCreateRequest: {
    type: 'object',
    required: ['instituicao', 'curso', 'grau', 'situacao', 'anoInicio'],
    properties: {
      instituicao: { type: 'string' },
      curso: { type: 'string' },
      grau: { type: 'string', enum: ['tecnico', 'graduacao', 'pos_graduacao', 'mestrado', 'doutorado'] },
      situacao: { type: 'string' },
      anoInicio: { type: 'integer' },
      anoConclusao: { type: 'integer', nullable: true },
    },
  },

  FormacaoUpdateRequest: {
    type: 'object',
    properties: {
      instituicao: { type: 'string' },
      curso: { type: 'string' },
      grau: { type: 'string', enum: ['tecnico', 'graduacao', 'pos_graduacao', 'mestrado', 'doutorado'] },
      situacao: { type: 'string' },
      anoInicio: { type: 'integer' },
      anoConclusao: { type: 'integer', nullable: true },
    },
  },

  FormacaoSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Formacao criada com sucesso.' },
      data: { $ref: '#/components/schemas/Formacao' },
    },
  },

  FormacaoListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Formacoes listadas com sucesso.' },
      data: { type: 'array', items: { $ref: '#/components/schemas/Formacao' } },
    },
  },

  ExperienciaCreateRequest: {
    type: 'object',
    required: ['empresa', 'cargo', 'descricaoAtivida_', 'dataInicio'],
    properties: {
      empresa: { type: 'string' },
      cargo: { type: 'string' },
      descricaoAtivida_: { type: 'string' },
      dataInicio: { type: 'string', format: 'date-time' },
      dataFim: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  ExperienciaUpdateRequest: {
    type: 'object',
    properties: {
      empresa: { type: 'string' },
      cargo: { type: 'string' },
      descricaoAtivida_: { type: 'string' },
      dataInicio: { type: 'string', format: 'date-time' },
      dataFim: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  ExperienciaSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Experiencia criada com sucesso.' },
      data: { $ref: '#/components/schemas/Experiencia' },
    },
  },

  ExperienciaListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Experiencias listadas com sucesso.' },
      data: { type: 'array', items: { $ref: '#/components/schemas/Experiencia' } },
    },
  },

  HabilidadeCreateRequest: {
    type: 'object',
    required: ['habilidade', 'nivel'],
    properties: {
      habilidade: { type: 'string', example: 'Node.js' },
      nivel: { type: 'string', enum: ['basico', 'intermediario', 'avancado', 'especialista'] },
    },
  },

  HabilidadeUpdateRequest: {
    type: 'object',
    properties: {
      habilidade: { type: 'string' },
      nivel: { type: 'string', enum: ['basico', 'intermediario', 'avancado', 'especialista'] },
    },
  },

  HabilidadeSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Habilidade criada com sucesso.' },
      data: { $ref: '#/components/schemas/Habilidade' },
    },
  },

  HabilidadeListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Habilidades listadas com sucesso.' },
      data: { type: 'array', items: { $ref: '#/components/schemas/Habilidade' } },
    },
  },

  CertificacaoCreateRequest: {
    type: 'object',
    required: ['nome', 'emissor'],
    properties: {
      nome: { type: 'string' },
      emissor: { type: 'string' },
      dataEmissao: { type: 'string', format: 'date-time', nullable: true },
      dataExpiracao: { type: 'string', format: 'date-time', nullable: true },
      codigo: { type: 'string' },
    },
  },

  CertificacaoUpdateRequest: {
    type: 'object',
    properties: {
      nome: { type: 'string' },
      emissor: { type: 'string' },
      dataEmissao: { type: 'string', format: 'date-time', nullable: true },
      dataExpiracao: { type: 'string', format: 'date-time', nullable: true },
      codigo: { type: 'string' },
    },
  },

  CertificacaoSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Certificacao criada com sucesso.' },
      data: { $ref: '#/components/schemas/Certificacao' },
    },
  },

  CertificacaoListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Certificacoes listadas com sucesso.' },
      data: { type: 'array', items: { $ref: '#/components/schemas/Certificacao' } },
    },
  },

  CandidaturaCreateRequest: {
    type: 'object',
    required: ['vagaId'],
    description:
      'Corpo da inscricao. `vagaId` e o unico campo aceito: `compativel`, `motivoIncompat_` e ' +
      '`movidoPor` sao escritos pelo servidor (os dois primeiros pela triagem por IA, o ultimo ' +
      'como trilha de auditoria) e sao ignorados se enviados.',
    properties: {
      vagaId: { type: 'string', example: 'vaga-001' },
    },
    example: { vagaId: 'vaga-001' },
  },

  CandidaturaStatusPatchRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['inscrito', 'em_analise', 'aprovado', 'reprovado'] },
      movidoPor: { type: 'string', example: 'recrutador@empresa.com' },
    },
  },

  CandidaturaSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidatura criada com sucesso.' },
      data: { $ref: '#/components/schemas/Candidatura' },
    },
  },

  CandidaturaListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidaturas listadas com sucesso.' },
      data: { type: 'array', items: { $ref: '#/components/schemas/Candidatura' } },
    },
  },

  CandidaturaDetalheResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidatura detalhada com sucesso.' },
      data: { $ref: '#/components/schemas/Candidatura' },
    },
  },

  CandidaturaCancelResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Candidatura cancelada com sucesso.' },
      data: {
        type: 'object',
        properties: {
          vagaId: { type: 'string', example: 'vaga-001' },
          cancelada: { type: 'boolean', example: true },
        },
      },
    },
  },

  RelatedDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Registro removido com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'rel-001' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },
};

export default candidatoSchemas;

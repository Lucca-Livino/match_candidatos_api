const RequisitoCriterio = {
  type: 'object',
  description:
    'Obrigatorio quando o criterio e obrigatorio. Campos por tipo: skill_tecnica e certificacao usam itemId (e nivelMinimo opcional na habilidade); formacao usa grauMinimo, areaId (null = qualquer area) e aceitaCursando; experiencia usa areaId e mesesMinimos.',
  properties: {
    itemId: { type: 'string', example: '0831bb1a-5bc7-44f1-8ef5-0ff18620c8c4' },
    nivelMinimo: { type: 'string', enum: ['basico', 'intermediario', 'avancado', 'especialista'] },
    grauMinimo: { type: 'string', example: 'graduação' },
    areaId: { type: 'string', nullable: true, example: '2b04606b-e3a4-42d5-9aac-6b0c438f7c70' },
    aceitaCursando: { type: 'boolean', example: false },
    mesesMinimos: { type: 'integer', minimum: 0, example: 6 },
  },
};

const CriterioVaga = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67f000d2f7f6a0f123456789' },
    nome: { type: 'string', example: 'Node.js avancado' },
    tipo_criterio: {
      type: 'string',
      enum: ['skill_tecnica', 'formacao', 'experiencia', 'certificacao'],
      example: 'skill_tecnica',
    },
    peso_percentual: { type: 'number', example: 40 },
    obrigatorio: { type: 'boolean', example: true },
    descricao: { type: 'string', example: 'Conhecimento em APIs REST com Node.js e Express.' },
    requisito: { $ref: '#/components/schemas/RequisitoCriterio' },
  },
};

const Vaga = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67f000d2f7f6a0f123456780' },
    area: {
      type: 'string',
      enum: ['TI', 'RH', 'MARKETING', 'FINANCEIRO', 'COMERCIAL', 'OPERACOES', 'JURIDICO', 'ADMINISTRATIVO', 'OUTROS'],
      example: 'TI',
    },
    titulo: { type: 'string', example: 'Pessoa Desenvolvedora Backend Node.js' },
    descricao: {
      type: 'string',
      example: 'Vaga para atuar na evolucao de APIs e microsservicos de recrutamento.',
    },
    requisitos_gerais: {
      type: 'string',
      example: 'Boa comunicacao, colaboracao em time e autonomia para resolucao de problemas.',
    },
    status: {
      type: 'string',
      enum: ['ativa', 'pausada', 'arquivada'],
      example: 'ativa',
    },
    criterio_vaga: {
      type: 'array',
      items: { $ref: '#/components/schemas/CriterioVaga' },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const vagaSchemas = {
  RequisitoCriterio,
  CriterioVaga,
  Vaga,
  VagaCreateRequest: {
    type: 'object',
    required: ['area', 'titulo', 'descricao'],
    properties: {
      area: {
        type: 'string',
        enum: ['TI', 'RH', 'MARKETING', 'FINANCEIRO', 'COMERCIAL', 'OPERACOES', 'JURIDICO', 'ADMINISTRATIVO', 'OUTROS'],
        example: 'TI',
      },
      titulo: { type: 'string', example: 'Pessoa Desenvolvedora Backend Node.js' },
      descricao: {
        type: 'string',
        example: 'Vaga para atuar na evolucao de APIs e microsservicos de recrutamento.',
      },
      requisitos_gerais: {
        type: 'string',
        example: 'Boa comunicacao, colaboracao em time e autonomia para resolucao de problemas.',
      },
      criterio_vaga: {
        type: 'array',
        items: {
          type: 'object',
          required: ['nome', 'tipo_criterio', 'peso_percentual'],
          properties: {
            nome: { type: 'string', example: 'Node.js avancado' },
            tipo_criterio: {
              type: 'string',
              enum: ['skill_tecnica', 'formacao', 'experiencia', 'certificacao'],
              example: 'skill_tecnica',
            },
            peso_percentual: { type: 'number', example: 40 },
            obrigatorio: { type: 'boolean', example: true },
            descricao: { type: 'string', example: 'Conhecimento em APIs REST com Node.js e Express.' },
            requisito: { $ref: '#/components/schemas/RequisitoCriterio' },
          },
        },
      },
    },
  },
  VagaPatchRequest: {
    type: 'object',
    properties: {
      area: {
        type: 'string',
        enum: ['TI', 'RH', 'MARKETING', 'FINANCEIRO', 'COMERCIAL', 'OPERACOES', 'JURIDICO', 'ADMINISTRATIVO', 'OUTROS'],
      },
      titulo: { type: 'string', example: 'Pessoa Desenvolvedora Backend Senior' },
      descricao: {
        type: 'string',
        example: 'Atualizacao de escopo para foco em arquitetura e mentoria tecnica.',
      },
      requisitos_gerais: {
        type: 'string',
        example: 'Experiencia com lideranca tecnica e revisao de codigo.',
      },
      status: {
        type: 'string',
        enum: ['ativa', 'pausada', 'arquivada'],
        example: 'pausada',
      },
      criterio_vaga: {
        type: 'array',
        items: {
          type: 'object',
          required: ['nome', 'tipo_criterio', 'peso_percentual'],
          properties: {
            nome: { type: 'string', example: 'Experiencia com arquitetura de microsservicos' },
            tipo_criterio: {
              type: 'string',
              enum: ['skill_tecnica', 'formacao', 'experiencia', 'certificacao'],
              example: 'experiencia',
            },
            peso_percentual: { type: 'number', example: 50 },
            obrigatorio: { type: 'boolean', example: false },
            descricao: { type: 'string', example: 'Atuacao com sistemas de alta disponibilidade.' },
            requisito: { $ref: '#/components/schemas/RequisitoCriterio' },
          },
        },
      },
    },
  },
  VagaSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Vaga criada com sucesso.' },
      data: { $ref: '#/components/schemas/Vaga' },
    },
  },
  VagaListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Vagas listadas com sucesso.' },
      data: {
        type: 'object',
        properties: {
          docs: {
            type: 'array',
            items: { $ref: '#/components/schemas/Vaga' },
          },
          totalDocs: { type: 'integer', example: 2 },
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
  VagaDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Vaga excluida com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '67f000d2f7f6a0f123456780' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },
};

export default vagaSchemas;
const GrupoPermissao = {
  type: 'object',
  properties: {
    route: { type: 'string', example: 'vagas' },
    domain: { type: 'string', example: 'localhost' },
    active: { type: 'boolean', example: true },
    get: { type: 'boolean', example: true },
    post: { type: 'boolean', example: true },
    put: { type: 'boolean', example: false },
    patch: { type: 'boolean', example: true },
    delete: { type: 'boolean', example: true },
  },
};

const Grupo = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67f000d2f7f6a0f1234567a0' },
    nome: { type: 'string', example: 'recrutador' },
    descricao: { type: 'string', example: 'Gestao de vagas, questionarios e perguntas' },
    ativo: { type: 'boolean', example: true },
    permissions: { type: 'array', items: { $ref: '#/components/schemas/GrupoPermissao' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const grupoSchemas = {
  GrupoPermissao,
  Grupo,
  GrupoCreateRequest: {
    type: 'object',
    required: ['nome', 'descricao'],
    properties: {
      nome: { type: 'string', example: 'recrutador' },
      descricao: { type: 'string', example: 'Gestao de vagas, questionarios e perguntas' },
      ativo: { type: 'boolean', example: true },
      permissions: { type: 'array', items: { $ref: '#/components/schemas/GrupoPermissao' } },
    },
  },
  GrupoPatchRequest: {
    type: 'object',
    properties: {
      nome: { type: 'string', example: 'recrutador' },
      descricao: { type: 'string', example: 'Descricao atualizada' },
      ativo: { type: 'boolean', example: false },
      permissions: { type: 'array', items: { $ref: '#/components/schemas/GrupoPermissao' } },
    },
  },
  GrupoSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Grupo criado com sucesso.' },
      data: { $ref: '#/components/schemas/Grupo' },
    },
  },
  GrupoListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Grupos listados com sucesso.' },
      data: {
        type: 'object',
        properties: {
          docs: { type: 'array', items: { $ref: '#/components/schemas/Grupo' } },
          totalDocs: { type: 'integer', example: 3 },
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
  GrupoDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Grupo excluido com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '67f000d2f7f6a0f1234567a0' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },
};

export default grupoSchemas;

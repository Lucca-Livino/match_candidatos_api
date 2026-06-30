const Rota = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67f000d2f7f6a0f123456790' },
    route: { type: 'string', example: 'vagas' },
    domain: { type: 'string', example: 'localhost' },
    active: { type: 'boolean', example: true },
    get: { type: 'boolean', example: true },
    post: { type: 'boolean', example: true },
    put: { type: 'boolean', example: false },
    patch: { type: 'boolean', example: true },
    delete: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const rotaSchemas = {
  Rota,
  RotaCreateRequest: {
    type: 'object',
    required: ['route', 'domain'],
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
  },
  RotaPatchRequest: {
    type: 'object',
    properties: {
      route: { type: 'string', example: 'vagas' },
      domain: { type: 'string', example: 'localhost' },
      active: { type: 'boolean', example: false },
      get: { type: 'boolean' },
      post: { type: 'boolean' },
      put: { type: 'boolean' },
      patch: { type: 'boolean' },
      delete: { type: 'boolean' },
    },
  },
  RotaSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Rota criada com sucesso.' },
      data: { $ref: '#/components/schemas/Rota' },
    },
  },
  RotaListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Rotas listadas com sucesso.' },
      data: {
        type: 'object',
        properties: {
          docs: { type: 'array', items: { $ref: '#/components/schemas/Rota' } },
          totalDocs: { type: 'integer', example: 8 },
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
  RotaDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Rota excluida com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '67f000d2f7f6a0f123456790' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },
};

export default rotaSchemas;

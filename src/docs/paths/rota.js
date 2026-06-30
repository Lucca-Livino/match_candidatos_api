const rotaPaths = {
  '/api/rotas': {
    get: {
      tags: ['Rotas (Admin)'],
      summary: 'Lista rotas registradas com paginacao',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        { name: 'route', in: 'query', schema: { type: 'string' } },
        { name: 'domain', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Rotas listadas com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaListResponse' } } } },
      },
    },
    post: {
      tags: ['Rotas (Admin)'],
      summary: 'Cria uma nova rota',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaCreateRequest' } } },
      },
      responses: {
        201: { description: 'Rota criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaSingleResponse' } } } },
        400: { description: 'Erro de validacao', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/rotas/{id}': {
    get: {
      tags: ['Rotas (Admin)'],
      summary: 'Busca rota por id',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Rota encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaSingleResponse' } } } },
        404: { description: 'Rota nao encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    patch: {
      tags: ['Rotas (Admin)'],
      summary: 'Atualiza rota parcialmente',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaPatchRequest' } } },
      },
      responses: {
        200: { description: 'Rota atualizada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaSingleResponse' } } } },
      },
    },
    delete: {
      tags: ['Rotas (Admin)'],
      summary: 'Deleta rota',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Rota excluida com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RotaDeleteResponse' } } } },
      },
    },
  },
};

export default rotaPaths;

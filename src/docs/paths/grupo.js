const grupoPaths = {
  '/api/grupos': {
    get: {
      tags: ['Grupos (Admin)'],
      summary: 'Lista grupos de permissao com paginacao',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        { name: 'nome', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Grupos listados com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoListResponse' } } } },
      },
    },
    post: {
      tags: ['Grupos (Admin)'],
      summary: 'Cria um novo grupo de permissao',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoCreateRequest' } } },
      },
      responses: {
        201: { description: 'Grupo criado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoSingleResponse' } } } },
        400: { description: 'Erro de validacao', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/grupos/{id}': {
    get: {
      tags: ['Grupos (Admin)'],
      summary: 'Busca grupo por id',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Grupo encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoSingleResponse' } } } },
        404: { description: 'Grupo nao encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    patch: {
      tags: ['Grupos (Admin)'],
      summary: 'Atualiza grupo parcialmente',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoPatchRequest' } } },
      },
      responses: {
        200: { description: 'Grupo atualizado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoSingleResponse' } } } },
      },
    },
    delete: {
      tags: ['Grupos (Admin)'],
      summary: 'Deleta grupo',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Grupo excluido com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/GrupoDeleteResponse' } } } },
      },
    },
  },
};

export default grupoPaths;

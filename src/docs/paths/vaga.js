const vagaPaths = {
  '/api/vagas': {
    get: {
      tags: ['Vagas RH'],
      summary: 'Lista vagas com paginacao e filtros',
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        },
        {
          name: 'titulo',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'area',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['TI', 'RH', 'MARKETING', 'FINANCEIRO', 'COMERCIAL', 'OPERACOES', 'JURIDICO', 'ADMINISTRATIVO', 'OUTROS'],
          },
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ativa', 'pausada', 'arquivada'] },
        },
        {
          name: 'tipo_criterio',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['skill_tecnica', 'formacao', 'experiencia', 'certificacao'],
          },
        },
      ],
      responses: {
        200: {
          description: 'Vagas listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VagaListResponse' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Vagas RH'],
      summary: 'Cria uma nova vaga',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VagaCreateRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Vaga criada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VagaSingleResponse' },
            },
          },
        },
        400: {
          description: 'Erro de validacao',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/vagas/{id}': {
    get: {
      tags: ['Vagas RH'],
      summary: 'Busca vaga por id',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'Vaga encontrada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VagaSingleResponse' },
            },
          },
        },
        404: {
          description: 'Vaga nao encontrada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    patch: {
      tags: ['Vagas RH'],
      summary: 'Atualiza vaga parcialmente',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VagaPatchRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Vaga atualizada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VagaSingleResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Vagas RH'],
      summary: 'Deleta vaga',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'Vaga excluida com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VagaDeleteResponse' },
            },
          },
        },
      },
    },
  },
};

export default vagaPaths;
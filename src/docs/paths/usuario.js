const usuarioPaths = {
  '/api/usuarios/registro': {
    post: {
      tags: ['Usuarios RH'],
      summary: 'Auto-cadastro publico de candidato',
      description: 'Rota publica (sem autenticacao). Cria um usuario com papel candidato via Better Auth.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UsuarioRegistroRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Candidato registrado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioSingleResponse' },
            },
          },
        },
        409: {
          description: 'Email ja cadastrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/usuarios': {
    get: {
      tags: ['Usuarios RH'],
      summary: 'Lista usuarios com paginacao',
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
          name: 'nome',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'email',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'status_ativo',
          in: 'query',
          schema: { type: 'boolean' },
        },
      ],
      responses: {
        200: {
          description: 'Usuarios listados com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioListResponse' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Usuarios RH'],
      summary: 'Cria um novo usuario',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UsuarioCreateRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Usuario criado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioSingleResponse' },
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
  '/api/usuarios/{id}': {
    get: {
      tags: ['Usuarios RH'],
      summary: 'Busca usuario por id',
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
          description: 'Usuario encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioSingleResponse' },
            },
          },
        },
        404: {
          description: 'Usuario nao encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    patch: {
      tags: ['Usuarios RH'],
      summary: 'Atualiza usuario parcialmente',
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
            schema: { $ref: '#/components/schemas/UsuarioPatchRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Usuario atualizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioSingleResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Usuarios RH'],
      summary: 'Deleta usuario',
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
          description: 'Usuario excluido com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioDeleteResponse' },
            },
          },
        },
      },
    },
  },
};

export default usuarioPaths;

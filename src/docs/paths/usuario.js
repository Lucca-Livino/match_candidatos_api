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
        {
          name: 'papel',
          in: 'query',
          description: 'Um ou mais papeis separados por virgula (ex.: recrutador,suporte). So o administrador filtra papeis alem de candidato.',
          schema: { type: 'string' },
        },
        {
          name: 'situacao',
          in: 'query',
          schema: { type: 'string', enum: ['pendente', 'ativo', 'desativado'] },
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
  '/api/usuarios/convite': {
    post: {
      tags: ['Usuarios RH'],
      summary: 'Convida recrutador ou suporte por e-mail (administrador)',
      description:
        'Cria a conta com senha aleatoria, marca o convite como pendente e envia por e-mail um link de ativacao valido por 24 horas. Se o envio falhar, a conta e desfeita.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nome', 'email', 'papel'],
              properties: {
                nome: { type: 'string', example: 'Ana Recrutadora' },
                email: { type: 'string', format: 'email', example: 'ana@empresa.com' },
                papel: { type: 'string', enum: ['recrutador', 'suporte'] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Convite enviado' },
        400: { description: 'Dados invalidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        409: { description: 'E-mail ja cadastrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        502: { description: 'Falha no envio do e-mail (EMAIL_FALHOU)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/reenviar-convite': {
    post: {
      tags: ['Usuarios RH'],
      summary: 'Reenvia o convite de uma conta pendente (administrador)',
      description: 'Gera um link novo e invalida o anterior.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Convite reenviado' },
        400: { description: 'Conta ja ativada (CONTA_JA_ATIVADA)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Usuario nao encontrado' },
        502: { description: 'Falha no envio do e-mail (EMAIL_FALHOU)' },
      },
    },
  },
  '/api/usuarios/ativar': {
    post: {
      tags: ['Usuarios RH'],
      summary: 'Ativa a conta convidada definindo a senha (publica)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'senha'],
              properties: {
                token: { type: 'string' },
                senha: {
                  type: 'string',
                  description: '8 a 128 caracteres, com maiuscula, minuscula, numero e caractere especial.',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Conta ativada' },
        400: {
          description: 'TOKEN_INVALIDO, CONTA_JA_ATIVADA ou SENHA_FRACA',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },
  '/api/usuarios/{id}/status': {
    patch: {
      tags: ['Usuarios RH'],
      summary: 'Desativa ou reativa uma conta (administrador)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['status_ativo'], properties: { status_ativo: { type: 'boolean' } } },
          },
        },
      },
      responses: {
        200: { description: 'Situacao alterada' },
        409: { description: 'AUTODESATIVACAO ou ULTIMO_ADMINISTRADOR', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Usuario nao encontrado' },
      },
    },
  },
};

export default usuarioPaths;

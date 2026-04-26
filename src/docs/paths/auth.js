const authPaths = {
  '/api/auth/sign-up/email': {
    post: {
      tags: ['Auth'],
      summary: 'Cadastro com email e senha',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthSignUpRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Usuario cadastrado e autenticado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSignInResponse' },
            },
          },
        },
        400: {
          description: 'Erro de validacao',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthErrorResponse' },
            },
          },
        },
        422: {
          description: 'Email ja cadastrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/auth/sign-in/email': {
    post: {
      tags: ['Auth'],
      summary: 'Login com email e senha',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthSignInRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Login realizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSignInResponse' },
            },
          },
        },
        401: {
          description: 'Credenciais invalidas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/auth/sign-out': {
    post: {
      tags: ['Auth'],
      summary: 'Logout da sessao atual',
      responses: {
        200: {
          description: 'Sessao encerrada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSignOutResponse' },
            },
          },
        },
      },
    },
  },
  '/api/auth/get-session': {
    get: {
      tags: ['Auth'],
      summary: 'Retorna sessao atual do usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Sessao retornada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSessionResponse' },
            },
          },
        },
        401: {
          description: 'Sessao invalida ou expirada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/me': {
    get: {
      tags: ['Auth'],
      summary: 'Retorna perfil do usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Perfil retornado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthMeResponse' },
            },
          },
        },
        401: {
          description: 'Nao autorizado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthErrorResponse' },
            },
          },
        },
      },
    },
  },
};

export default authPaths;

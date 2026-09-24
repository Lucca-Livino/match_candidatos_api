const Usuario = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67eb8c6ca9125055f940f5e0' },
    nome: { type: 'string', example: 'Maria RH' },
    email: { type: 'string', example: 'maria.rh@empresa.com' },
    telefone: { type: 'string', example: '(11) 99999-9999' },
    linkedin: {
      type: 'string',
      description: 'URL canonica do perfil. Armazenada sempre como https://www.linkedin.com/in/<perfil>.',
      example: 'https://www.linkedin.com/in/maria-rh',
    },
    cidade: { type: 'string', example: 'Sao Paulo' },
    tipos_permissao: {
      type: 'array',
      items: { type: 'string', enum: ['administrador', 'recrutador', 'candidato', 'suporte'] },
      example: ['recrutador'],
    },
    status_ativo: { type: 'boolean', example: true },
    groups: {
      type: 'array',
      description: 'Ids dos grupos de permissao aos quais o usuario pertence.',
      items: { type: 'string', example: '67eb8c6ca9125055f940f5e1' },
    },
    permissions: {
      type: 'array',
      description: 'Permissoes por rota atribuidas diretamente ao usuario.',
      items: {
        type: 'object',
        properties: {
          route: { type: 'string', example: '/vagas' },
          domain: { type: 'string', example: 'localhost' },
          active: { type: 'boolean', example: true },
          get: { type: 'boolean', example: true },
          post: { type: 'boolean', example: false },
          put: { type: 'boolean', example: false },
          patch: { type: 'boolean', example: false },
          delete: { type: 'boolean', example: false },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const usuarioSchemas = {
  Usuario,
  UsuarioRegistroRequest: {
    type: 'object',
    required: ['nome', 'email', 'senha'],
    properties: {
      nome: { type: 'string', example: 'Joao Candidato' },
      email: { type: 'string', format: 'email', example: 'joao.candidato@email.com' },
      senha: { type: 'string', format: 'password', example: 'Senha@123' },
    },
  },
  UsuarioCreateRequest: {
    type: 'object',
    required: ['nome', 'email', 'senha', 'tipos_permissao'],
    properties: {
      nome: { type: 'string', example: 'Maria RH' },
      email: { type: 'string', format: 'email', example: 'maria.rh@empresa.com' },
      senha: { type: 'string', format: 'password', example: 'Senha@123' },
      telefone: { type: 'string', maxLength: 20, example: '(11) 99999-9999' },
      linkedin: {
        type: 'string',
        maxLength: 255,
        description:
          'Endereco do perfil no LinkedIn. Aceita com ou sem https://, com www. ou prefixo de pais, e com os parametros de rastreio do "copiar link"; e normalizado para https://www.linkedin.com/in/<perfil>. Qualquer outro formato devolve 400.',
        example: 'https://www.linkedin.com/in/maria-rh',
      },
      cidade: { type: 'string', maxLength: 120, example: 'Sao Paulo' },
      tipos_permissao: {
        type: 'array',
        minItems: 1,
        items: { type: 'string', enum: ['administrador', 'recrutador', 'candidato', 'suporte'] },
        example: ['recrutador'],
      },
      status_ativo: { type: 'boolean', example: true },
    },
  },
  UsuarioPatchRequest: {
    type: 'object',
    properties: {
      nome: { type: 'string', example: 'Maria RH Atualizada' },
      email: { type: 'string', format: 'email', example: 'maria.atualizada@empresa.com' },
      telefone: { type: 'string', maxLength: 20, example: '(11) 98888-7777' },
      linkedin: {
        type: 'string',
        maxLength: 255,
        description: 'Envie "" para remover o link do perfil.',
        example: 'https://www.linkedin.com/in/maria-rh',
      },
      cidade: { type: 'string', maxLength: 120, example: 'Campinas' },
      tipos_permissao: {
        type: 'array',
        minItems: 1,
        items: { type: 'string', enum: ['administrador', 'recrutador', 'candidato', 'suporte'] },
        example: ['candidato'],
      },
      status_ativo: { type: 'boolean', example: false },
    },
  },
  UsuarioSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Usuario criado com sucesso.' },
      data: { $ref: '#/components/schemas/Usuario' },
    },
  },
  UsuarioListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Usuarios listados com sucesso.' },
      data: {
        type: 'object',
        properties: {
          docs: {
            type: 'array',
            items: { $ref: '#/components/schemas/Usuario' },
          },
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
  UsuarioDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Usuario excluido com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '67eb8c6ca9125055f940f5e0' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'email invalido.' },
          details: { nullable: true },
        },
      },
    },
  },
};

export default usuarioSchemas;

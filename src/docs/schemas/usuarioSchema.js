const Usuario = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '67eb8c6ca9125055f940f5e0' },
    nome: { type: 'string', example: 'Maria RH' },
    email: { type: 'string', example: 'maria.rh@empresa.com' },
    tipos_permissao: {
      type: 'array',
      items: { type: 'string', enum: ['recrutador', 'candidato'] },
      example: ['recrutador', 'candidato'],
    },
    status_ativo: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const usuarioSchemas = {
  Usuario,
  UsuarioCreateRequest: {
    type: 'object',
    required: ['nome', 'email', 'tipos_permissao'],
    properties: {
      nome: { type: 'string', example: 'Maria RH' },
      email: { type: 'string', format: 'email', example: 'maria.rh@empresa.com' },
      tipos_permissao: {
        type: 'array',
        minItems: 1,
        items: { type: 'string', enum: ['recrutador', 'candidato'] },
        example: ['recrutador', 'candidato'],
      },
      status_ativo: { type: 'boolean', example: true },
    },
  },
  UsuarioPatchRequest: {
    type: 'object',
    properties: {
      nome: { type: 'string', example: 'Maria RH Atualizada' },
      email: { type: 'string', format: 'email', example: 'maria.atualizada@empresa.com' },
      tipos_permissao: {
        type: 'array',
        minItems: 1,
        items: { type: 'string', enum: ['recrutador', 'candidato'] },
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

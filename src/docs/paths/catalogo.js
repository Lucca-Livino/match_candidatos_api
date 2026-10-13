const ErrorContent = { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } };

const ItemCatalogoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: '0831bb1a-5bc7-44f1-8ef5-0ff18620c8c4' },
    tipo: { type: 'string', enum: ['habilidade', 'area_curso', 'area_atuacao', 'certificacao'], example: 'habilidade' },
    nome: { type: 'string', example: 'PostgreSQL' },
    sinonimos: { type: 'array', items: { type: 'string' }, example: ['Postgres'] },
    implica: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ids de itens do mesmo tipo que este item comprova (um nivel so, sem cadeia).',
    },
    ativo: { type: 'boolean', example: true },
    chaves: { type: 'array', items: { type: 'string' }, example: ['postgresql', 'postgres'] },
  },
};

const ItemCatalogoResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: ItemCatalogoSchema,
  },
};

const ItemCatalogoListResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: { type: 'array', items: ItemCatalogoSchema },
  },
};

const catalogoPaths = {
  '/api/catalogo': {
    get: {
      tags: ['Catalogo'],
      summary: 'Busca itens ativos do catalogo (autocomplete)',
      description:
        'Devolve apenas itens ativos do tipo informado, filtrados por prefixo de nome ou sinonimo quando q e enviado.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'tipo',
          in: 'query',
          required: true,
          schema: { type: 'string', enum: ['habilidade', 'area_curso', 'area_atuacao', 'certificacao'] },
        },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Prefixo de nome ou sinonimo.' },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 } },
        {
          name: 'todos',
          in: 'query',
          schema: { type: 'boolean' },
          description: 'So administrador: lista o tipo inteiro, inativos inclusive, sem limite e ignorando q.',
        },
      ],
      responses: {
        200: {
          description: 'Itens listados com sucesso',
          content: {
            'application/json': {
              schema: ItemCatalogoListResponse,
            },
          },
        },
        400: { description: 'Parametros invalidos (tipo ausente ou fora da lista)', content: ErrorContent },
        401: { description: 'Token ausente ou invalido' },
        403: { description: 'todos=true pedido por quem nao e administrador', content: ErrorContent },
      },
    },
    post: {
      tags: ['Catalogo'],
      summary: 'Cria um item do catalogo',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['tipo', 'nome'],
              properties: {
                tipo: { type: 'string', enum: ['habilidade', 'area_curso', 'area_atuacao', 'certificacao'] },
                nome: { type: 'string', example: 'PostgreSQL' },
                sinonimos: { type: 'array', items: { type: 'string' }, example: ['Postgres'] },
                implica: { type: 'array', items: { type: 'string' }, description: 'Ids de itens do mesmo tipo.' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Item criado com sucesso',
          content: { 'application/json': { schema: ItemCatalogoResponse } },
        },
        400: { description: 'Erro de validacao', content: ErrorContent },
        403: { description: 'Papel sem permissao', content: ErrorContent },
        409: { description: 'Nome ou sinonimo ja usado por outro item do mesmo tipo', content: ErrorContent },
      },
    },
  },
  '/api/catalogo/{id}': {
    patch: {
      tags: ['Catalogo'],
      summary: 'Atualiza um item do catalogo',
      description:
        'Nao ha exclusao: desativar tira o item do autocomplete e mantem vagas e perfis que o referenciam.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                sinonimos: { type: 'array', items: { type: 'string' } },
                implica: { type: 'array', items: { type: 'string' } },
                ativo: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Item atualizado com sucesso', content: { 'application/json': { schema: ItemCatalogoResponse } } },
        400: { description: 'Erro de validacao', content: ErrorContent },
        403: { description: 'Papel sem permissao', content: ErrorContent },
        404: { description: 'Item do catalogo nao encontrado', content: ErrorContent },
        409: { description: 'Nome ou sinonimo ja usado por outro item do mesmo tipo', content: ErrorContent },
      },
    },
  },
};

export default catalogoPaths;

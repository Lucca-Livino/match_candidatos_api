const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Id do usuario dono do curriculo' };

const usuarioCurriculoPaths = {
  // ───────────────────────────── Formacao ─────────────────────────────
  '/api/usuarios/{id}/formacao': {
    post: {
      tags: ['Usuario Formacao'],
      summary: 'Cria formacao do usuario',
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/FormacaoCreateRequest' } } },
      },
      responses: {
        201: { description: 'Formacao criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/FormacaoSingleResponse' } } } },
      },
    },
    get: {
      tags: ['Usuario Formacao'],
      summary: 'Lista formacoes do usuario',
      parameters: [idParam],
      responses: {
        200: { description: 'Formacoes listadas com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/FormacaoListResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/formacao/{formacaoId}': {
    put: {
      tags: ['Usuario Formacao'],
      summary: 'Atualiza formacao do usuario',
      parameters: [idParam, { name: 'formacaoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/FormacaoUpdateRequest' } } },
      },
      responses: {
        200: { description: 'Formacao atualizada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/FormacaoSingleResponse' } } } },
      },
    },
    delete: {
      tags: ['Usuario Formacao'],
      summary: 'Remove formacao do usuario',
      parameters: [idParam, { name: 'formacaoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Formacao removida com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } } } },
      },
    },
  },

  // ─────────────────────────── Experiencia ───────────────────────────
  '/api/usuarios/{id}/experiencia': {
    post: {
      tags: ['Usuario Experiencia'],
      summary: 'Cria experiencia do usuario',
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ExperienciaCreateRequest' } } },
      },
      responses: {
        201: { description: 'Experiencia criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExperienciaSingleResponse' } } } },
      },
    },
    get: {
      tags: ['Usuario Experiencia'],
      summary: 'Lista experiencias do usuario',
      parameters: [idParam],
      responses: {
        200: { description: 'Experiencias listadas com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExperienciaListResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/experiencia/{experienciaId}': {
    put: {
      tags: ['Usuario Experiencia'],
      summary: 'Atualiza experiencia do usuario',
      parameters: [idParam, { name: 'experienciaId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ExperienciaUpdateRequest' } } },
      },
      responses: {
        200: { description: 'Experiencia atualizada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExperienciaSingleResponse' } } } },
      },
    },
    delete: {
      tags: ['Usuario Experiencia'],
      summary: 'Remove experiencia do usuario',
      parameters: [idParam, { name: 'experienciaId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Experiencia removida com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } } } },
      },
    },
  },

  // ──────────────────────────── Habilidade ────────────────────────────
  '/api/usuarios/{id}/habilidade': {
    post: {
      tags: ['Usuario Habilidade'],
      summary: 'Cria habilidade do usuario',
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/HabilidadeCreateRequest' } } },
      },
      responses: {
        201: { description: 'Habilidade criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/HabilidadeSingleResponse' } } } },
      },
    },
    get: {
      tags: ['Usuario Habilidade'],
      summary: 'Lista habilidades do usuario',
      parameters: [idParam],
      responses: {
        200: { description: 'Habilidades listadas com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/HabilidadeListResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/habilidade/{habilidadeId}': {
    put: {
      tags: ['Usuario Habilidade'],
      summary: 'Atualiza habilidade do usuario',
      parameters: [idParam, { name: 'habilidadeId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/HabilidadeUpdateRequest' } } },
      },
      responses: {
        200: { description: 'Habilidade atualizada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/HabilidadeSingleResponse' } } } },
      },
    },
    delete: {
      tags: ['Usuario Habilidade'],
      summary: 'Remove habilidade do usuario',
      parameters: [idParam, { name: 'habilidadeId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Habilidade removida com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } } } },
      },
    },
  },

  // ─────────────────────────── Certificacao ───────────────────────────
  '/api/usuarios/{id}/certificacao': {
    post: {
      tags: ['Usuario Certificacao'],
      summary: 'Cria certificacao do usuario',
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CertificacaoCreateRequest' } } },
      },
      responses: {
        201: { description: 'Certificacao criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CertificacaoSingleResponse' } } } },
      },
    },
    get: {
      tags: ['Usuario Certificacao'],
      summary: 'Lista certificacoes do usuario',
      parameters: [idParam],
      responses: {
        200: { description: 'Certificacoes listadas com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CertificacaoListResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/certificacao/{certificacaoId}': {
    put: {
      tags: ['Usuario Certificacao'],
      summary: 'Atualiza certificacao do usuario',
      parameters: [idParam, { name: 'certificacaoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CertificacaoUpdateRequest' } } },
      },
      responses: {
        200: { description: 'Certificacao atualizada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CertificacaoSingleResponse' } } } },
      },
    },
    delete: {
      tags: ['Usuario Certificacao'],
      summary: 'Remove certificacao do usuario',
      parameters: [idParam, { name: 'certificacaoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Certificacao removida com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } } } },
      },
    },
  },

  // ──────────────────────────── Candidatura ───────────────────────────
  '/api/usuarios/{id}/candidatura': {
    post: {
      tags: ['Usuario Candidatura'],
      summary: 'Cria candidatura do usuario em uma vaga',
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaCreateRequest' } } },
      },
      responses: {
        201: { description: 'Candidatura criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaSingleResponse' } } } },
        409: { description: 'Usuario ja inscrito nesta vaga', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    get: {
      tags: ['Usuario Candidatura'],
      summary: 'Lista candidaturas do usuario',
      parameters: [idParam],
      responses: {
        200: { description: 'Candidaturas listadas com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaListResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/candidatura/{vagaId}': {
    get: {
      tags: ['Usuario Candidatura'],
      summary: 'Detalha candidatura do usuario em uma vaga',
      parameters: [idParam, { name: 'vagaId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Candidatura detalhada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaDetalheResponse' } } } },
        404: { description: 'Candidatura nao encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['Usuario Candidatura'],
      summary: 'Cancela candidatura do usuario',
      parameters: [idParam, { name: 'vagaId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Candidatura cancelada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaCancelResponse' } } } },
      },
    },
  },
  '/api/usuarios/{id}/candidatura/{vagaId}/status': {
    patch: {
      tags: ['Usuario Candidatura'],
      summary: 'Atualiza status da candidatura (recrutador/admin)',
      parameters: [idParam, { name: 'vagaId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaStatusPatchRequest' } } },
      },
      responses: {
        200: { description: 'Status da candidatura atualizado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidaturaSingleResponse' } } } },
        400: { description: 'Transicao de status invalida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
};

export default usuarioCurriculoPaths;

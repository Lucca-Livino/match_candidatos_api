const candidatoPaths = {
  '/api/candidato': {
    get: {
      tags: ['Candidatos'],
      summary: 'Lista candidatos com paginacao e filtros',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        { name: 'cidade', in: 'query', schema: { type: 'string' } },
        { name: 'estado', in: 'query', schema: { type: 'string', example: 'SP' } },
        { name: 'nome', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Candidatos listados com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidatoListResponse' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Candidatos'],
      summary: 'Cria um novo candidato',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CandidatoCreateRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Candidato criado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidatoSingleResponse' },
            },
          },
        },
        409: {
          description: 'Email ja em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/{id}': {
    get: {
      tags: ['Candidatos'],
      summary: 'Busca candidato completo por id',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Candidato encontrado com relacionamentos',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidatoCompletoResponse' },
            },
          },
        },
      },
    },
    put: {
      tags: ['Candidatos'],
      summary: 'Atualiza dados pessoais do candidato',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CandidatoUpdateRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Candidato atualizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidatoSingleResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Candidatos'],
      summary: 'Deleta candidato (respeitando bloqueio por candidaturas ativas)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Candidato excluido com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidatoDeleteResponse' },
            },
          },
        },
        400: {
          description: 'Bloqueio de regra de negocio',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/formacao/{id}': {
    get: {
      tags: ['Candidatos'],
      summary: 'Lista formacoes por id do candidato',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do candidato' }],
      responses: {
        200: {
          description: 'Formacoes listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FormacaoListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/experiencia/{id}': {
    get: {
      tags: ['Candidatos'],
      summary: 'Lista experiencias por id do candidato',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do candidato' }],
      responses: {
        200: {
          description: 'Experiencias listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExperienciaListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/habilidade/{id}': {
    get: {
      tags: ['Candidatos'],
      summary: 'Lista habilidades por id do candidato',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do candidato' }],
      responses: {
        200: {
          description: 'Habilidades listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HabilidadeListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/certificacao/{id}': {
    get: {
      tags: ['Candidatos'],
      summary: 'Lista certificacoes por id do candidato',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do candidato' }],
      responses: {
        200: {
          description: 'Certificacoes listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CertificacaoListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/candidatura/{id}': {
    get: {
      tags: ['Candidatos'],
      summary: 'Busca candidato completo pelo id de uma candidatura',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Candidato encontrado com relacionamentos',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidatoCompletoResponse' },
            },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/formacao': {
    get: {
      tags: ['Candidato Formacao'],
      summary: 'Lista formacoes do candidato',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Formacoes listadas com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FormacaoListResponse' } },
          },
        },
      },
    },
    post: {
      tags: ['Candidato Formacao'],
      summary: 'Adiciona formacao academica',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/FormacaoCreateRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Formacao criada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FormacaoSingleResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/formacao/{id}': {
    put: {
      tags: ['Candidato Formacao'],
      summary: 'Atualiza formacao',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/FormacaoUpdateRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Formacao atualizada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FormacaoSingleResponse' } },
          },
        },
      },
    },
    delete: {
      tags: ['Candidato Formacao'],
      summary: 'Remove formacao',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Formacao removida com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/experiencia': {
    get: {
      tags: ['Candidato Experiencia'],
      summary: 'Lista experiencias do candidato (ordenadas por dataInicio desc)',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Experiencias listadas com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ExperienciaListResponse' } },
          },
        },
      },
    },
    post: {
      tags: ['Candidato Experiencia'],
      summary: 'Adiciona experiencia profissional',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExperienciaCreateRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Experiencia criada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ExperienciaSingleResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/experiencia/{id}': {
    put: {
      tags: ['Candidato Experiencia'],
      summary: 'Atualiza experiencia profissional',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExperienciaUpdateRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Experiencia atualizada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ExperienciaSingleResponse' } },
          },
        },
      },
    },
    delete: {
      tags: ['Candidato Experiencia'],
      summary: 'Remove experiencia profissional',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Experiencia removida com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/habilidade': {
    get: {
      tags: ['Candidato Habilidade'],
      summary: 'Lista habilidades do candidato',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Habilidades listadas com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/HabilidadeListResponse' } },
          },
        },
      },
    },
    post: {
      tags: ['Candidato Habilidade'],
      summary: 'Adiciona habilidade do candidato',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/HabilidadeCreateRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Habilidade criada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/HabilidadeSingleResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/habilidade/{id}': {
    put: {
      tags: ['Candidato Habilidade'],
      summary: 'Atualiza habilidade do candidato',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/HabilidadeUpdateRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Habilidade atualizada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/HabilidadeSingleResponse' } },
          },
        },
      },
    },
    delete: {
      tags: ['Candidato Habilidade'],
      summary: 'Remove habilidade do candidato',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Habilidade removida com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/certificacao': {
    get: {
      tags: ['Candidato Certificacao'],
      summary: 'Lista certificacoes do candidato (com campo expirada)',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Certificacoes listadas com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CertificacaoListResponse' } },
          },
        },
      },
    },
    post: {
      tags: ['Candidato Certificacao'],
      summary: 'Adiciona certificacao do candidato',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CertificacaoCreateRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Certificacao criada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CertificacaoSingleResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/certificacao/{id}': {
    put: {
      tags: ['Candidato Certificacao'],
      summary: 'Atualiza certificacao do candidato',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CertificacaoUpdateRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Certificacao atualizada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CertificacaoSingleResponse' } },
          },
        },
      },
    },
    delete: {
      tags: ['Candidato Certificacao'],
      summary: 'Remove certificacao do candidato',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Certificacao removida com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RelatedDeleteResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/candidatura': {
    get: {
      tags: ['Candidato Candidatura'],
      summary: 'Lista candidaturas do candidato',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Candidaturas listadas com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CandidaturaListResponse' } },
          },
        },
      },
    },
    post: {
      tags: ['Candidato Candidatura'],
      summary: 'Candidata-se a uma vaga',
      parameters: [{ name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CandidaturaCreateRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Candidatura criada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CandidaturaSingleResponse' } },
          },
        },
        409: {
          description: 'Candidatura duplicada na mesma vaga',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/candidatura/{vagaId}': {
    get: {
      tags: ['Candidato Candidatura'],
      summary: 'Detalha candidatura',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'vagaId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Candidatura detalhada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CandidaturaDetalheResponse' } },
          },
        },
      },
    },
    delete: {
      tags: ['Candidato Candidatura'],
      summary: 'Cancela candidatura (somente inscrito ou em_analise)',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'vagaId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Candidatura cancelada com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CandidaturaCancelResponse' } },
          },
        },
      },
    },
  },

  '/api/candidato/{candidatoId}/candidatura/{vagaId}/status': {
    patch: {
      tags: ['Candidato Candidatura'],
      summary: 'Atualiza status da candidatura',
      parameters: [
        { name: 'candidatoId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'vagaId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CandidaturaStatusPatchRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Status atualizado com sucesso',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CandidaturaSingleResponse' } },
          },
        },
      },
    },
  },
};

export default candidatoPaths;

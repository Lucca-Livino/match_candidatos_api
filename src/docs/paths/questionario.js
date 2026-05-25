const questionarioPaths = {
  '/api/questionario': {
    post: {
      tags: ['Questionarios RH'],
      summary: 'Cria um novo questionario vinculado a uma vaga',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/QuestionarioCreateRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Questionario criado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionarioSingleResponse' },
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
    get: {
      tags: ['Questionarios RH'],
      summary: 'Lista questionarios com filtros opcionais',
      parameters: [
        {
          name: 'vagaId',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'ativo',
          in: 'query',
          schema: { type: 'integer', enum: [0, 1] },
        },
      ],
      responses: {
        200: {
          description: 'Questionarios listados com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionarioListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/questionario/{id}': {
    get: {
      tags: ['Questionarios RH'],
      summary: 'Busca questionario por id com perguntas e opcoes',
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
          description: 'Questionario encontrado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionarioDetalhadoResponse' },
            },
          },
        },
        404: {
          description: 'Questionario nao encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    put: {
      tags: ['Questionarios RH'],
      summary: 'Atualiza dados do questionario',
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
            schema: { $ref: '#/components/schemas/QuestionarioUpdateRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Questionario atualizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionarioSingleResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Questionarios RH'],
      summary: 'Remove questionario sem respostas vinculadas',
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
          description: 'Questionario removido com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionarioDeleteResponse' },
            },
          },
        },
        400: {
          description: 'Questionario possui respostas vinculadas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/questionario/{id}/ativo': {
    patch: {
      tags: ['Questionarios RH'],
      summary: 'Ativa ou desativa um questionario',
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
            schema: { $ref: '#/components/schemas/QuestionarioAtivoPatchRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Status ativo atualizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionarioSingleResponse' },
            },
          },
        },
      },
    },
  },

  '/api/pergunta': {
    post: {
      tags: ['Perguntas de Questionario'],
      summary: 'Cria pergunta vinculada a um questionario',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PerguntaCreateRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Pergunta criada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaSingleResponse' },
            },
          },
        },
      },
    },
    get: {
      tags: ['Perguntas de Questionario'],
      summary: 'Lista perguntas de um questionario',
      parameters: [
        {
          name: 'questionarioId',
          in: 'query',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'Perguntas listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/pergunta/reordenar': {
    patch: {
      tags: ['Perguntas de Questionario'],
      summary: 'Reordena perguntas de um questionario',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              oneOf: [
                { $ref: '#/components/schemas/PerguntaReorderRequest' },
                {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PerguntaReorderItem' },
                },
              ],
            },
            examples: {
              formatoObjeto: {
                summary: 'Formato com questionarioId e perguntas',
                value: {
                  questionarioId: 'quest-001',
                  perguntas: [
                    { id: 'perg-001', ordem: 2 },
                    { id: 'perg-002', ordem: 1 },
                  ],
                },
              },
              formatoArray: {
                summary: 'Formato apenas array de itens',
                value: [
                  { id: 'perg-001', ordem: 2 },
                  { id: 'perg-002', ordem: 1 },
                ],
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Perguntas reordenadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaListResponse' },
            },
          },
        },
      },
    },
  },

  '/api/pergunta/{id}': {
    get: {
      tags: ['Perguntas de Questionario'],
      summary: 'Busca pergunta por id com opcoes de resposta',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Pergunta encontrada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaSingleResponse' },
            },
          },
        },
        404: {
          description: 'Pergunta nao encontrada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    put: {
      tags: ['Perguntas de Questionario'],
      summary: 'Atualiza pergunta',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PerguntaUpdateRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Pergunta atualizada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaSingleResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Perguntas de Questionario'],
      summary: 'Remove pergunta sem respostas vinculadas',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Pergunta removida com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaDeleteResponse' },
            },
          },
        },
        400: {
          description: 'Pergunta possui respostas vinculadas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/pergunta/{id}/opcao': {
    post: {
      tags: ['Perguntas de Questionario'],
      summary: 'Adiciona opcao de resposta na pergunta',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OpcaoRespostaCreateRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Opcao criada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OpcaoRespostaSingleResponse' },
            },
          },
        },
      },
    },
  },

  '/api/pergunta/{id}/opcao/{opcaoId}': {
    put: {
      tags: ['Perguntas de Questionario'],
      summary: 'Atualiza opcao de resposta da pergunta',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'opcaoId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OpcaoRespostaUpdateRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Opcao atualizada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OpcaoRespostaSingleResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Perguntas de Questionario'],
      summary: 'Remove opcao de resposta da pergunta',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'opcaoId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Opcao removida com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PerguntaDeleteResponse' },
            },
          },
        },
      },
    },
  },

  '/api/resposta-questionario/iniciar': {
    post: {
      tags: ['Resposta de Questionario'],
      summary: 'Inicia resposta de questionario para um candidato',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RespostaQuestionarioIniciarRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Resposta iniciada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RespostaQuestionarioSingleResponse' },
            },
          },
        },
        400: {
          description: 'Questionario inativo ou payload invalido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/resposta-questionario/{id}/responder': {
    post: {
      tags: ['Resposta de Questionario'],
      summary: 'Registra respostas de perguntas no questionario em andamento',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RespostaQuestionarioResponderRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Respostas registradas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RespostaQuestionarioResponderResponse' },
            },
          },
        },
      },
    },
  },

  '/api/resposta-questionario/{id}/finalizar': {
    patch: {
      tags: ['Resposta de Questionario'],
      summary: 'Finaliza questionario',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Questionario finalizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RespostaQuestionarioFinalizarResponse' },
            },
          },
        },
      },
    },
  },

  '/api/resposta-questionario/{id}': {
    get: {
      tags: ['Resposta de Questionario'],
      summary: 'Busca resposta completa do questionario com perguntas e respostas',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Resposta encontrada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RespostaQuestionarioDetalheResponse' },
            },
          },
        },
      },
    },
  },
};

export default questionarioPaths;

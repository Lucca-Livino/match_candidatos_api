const OpcaoResposta = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '680a0b1c2d3e4f5a6b7c8d9a' },
    id: { type: 'string', example: 'opc-001' },
    perguntaId: { type: 'string', example: 'perg-001' },
    texto: { type: 'string', example: 'Node.js' },
    correta: { type: 'integer', enum: [0, 1], example: 1 },
    ordem: { type: 'integer', example: 1 },
  },
};

const Pergunta = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '680a0b1c2d3e4f5a6b7c8d90' },
    id: { type: 'string', example: 'perg-001' },
    questionarioId: { type: 'string', example: 'quest-001' },
    enunciado: { type: 'string', example: 'Qual tecnologia voce domina mais?' },
    tipoResposta: {
      type: 'string',
      enum: ['multipla_escolha', 'dissertativa', 'verdadeiro_falso'],
      example: 'multipla_escolha',
    },
    peso: {
      type: 'number',
      example: 1,
      description:
        'Sempre 1. Campo inerte, mantido por compatibilidade: nenhum service o le e ele nao entra no payload da triagem por IA. O peso que a avaliacao pondera e `peso_percentual`, dos criterios da vaga, e nao tem relacao com este.',
    },
    obrigatoria: { type: 'integer', enum: [0, 1], example: 1 },
    ordem: { type: 'integer', example: 1 },
    criadoEm: { type: 'string', format: 'date-time' },
  },
};

const PerguntaComOpcoes = {
  allOf: [
    { $ref: '#/components/schemas/Pergunta' },
    {
      type: 'object',
      properties: {
        opcaoResposta: {
          type: 'array',
          items: { $ref: '#/components/schemas/OpcaoResposta' },
        },
      },
    },
  ],
};

const Questionario = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '680a0b1c2d3e4f5a6b7c8d80' },
    id: { type: 'string', example: 'quest-001' },
    vagaId: { type: 'string', example: 'vaga-001' },
    criadoPor: { type: 'string', example: 'rh@empresa.com' },
    titulo: { type: 'string', example: 'Questionario Tecnico Backend' },
    instrucoes: { type: 'string', example: 'Responda com atencao e revise antes de finalizar.' },
    ativo: { type: 'integer', enum: [0, 1], example: 1 },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
  },
};

const QuestionarioDetalhado = {
  allOf: [
    { $ref: '#/components/schemas/Questionario' },
    {
      type: 'object',
      properties: {
        perguntas: {
          type: 'array',
          items: { $ref: '#/components/schemas/PerguntaComOpcoes' },
        },
      },
    },
  ],
};

const RespostaPergunta = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '680a0b1c2d3e4f5a6b7c8da0' },
    id: { type: 'string', example: 'resp-perg-001' },
    respostaQuestionId: { type: 'string', example: 'resp-quest-001' },
    perguntaId: { type: 'string', example: 'perg-001' },
    textoResposta: { type: 'string', example: 'Tenho experiencia em Node.js e MongoDB.' },
    criadoEm: { type: 'string', format: 'date-time' },
  },
};

const RespostaPerguntaComSelecao = {
  allOf: [
    { $ref: '#/components/schemas/RespostaPergunta' },
    {
      type: 'object',
      properties: {
        opcaoRespostaIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['opc-001'],
        },
      },
    },
  ],
};

const RespostaQuestionario = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '680a0b1c2d3e4f5a6b7c8db0' },
    id: { type: 'string', example: 'resp-quest-001' },
    questionarioId: { type: 'string', example: 'quest-001' },
    usuarioId: { type: 'string', example: 'user-001' },
    iniciadoEm: { type: 'string', format: 'date-time' },
    criadoEm: { type: 'string', format: 'date-time' },
    finalizadoEm: { type: 'string', format: 'date-time', nullable: true },
    status: {
      type: 'string',
      enum: ['em_andamento', 'finalizado'],
      example: 'em_andamento',
    },
  },
};

const RespostaQuestionarioDetalhada = {
  allOf: [
    { $ref: '#/components/schemas/RespostaQuestionario' },
    {
      type: 'object',
      properties: {
        questionario: {
          allOf: [
            { $ref: '#/components/schemas/Questionario' },
            {
              type: 'object',
              properties: {
                perguntas: {
                  type: 'array',
                  items: {
                    allOf: [
                      { $ref: '#/components/schemas/PerguntaComOpcoes' },
                      {
                        type: 'object',
                        properties: {
                          resposta: {
                            anyOf: [
                              { $ref: '#/components/schemas/RespostaPerguntaComSelecao' },
                              { type: 'null' },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    },
  ],
};

const questionarioSchemas = {
  OpcaoResposta,
  Pergunta,
  PerguntaComOpcoes,
  Questionario,
  QuestionarioDetalhado,
  RespostaPergunta,
  RespostaPerguntaComSelecao,
  RespostaQuestionario,
  RespostaQuestionarioDetalhada,

  QuestionarioCreateRequest: {
    type: 'object',
    required: ['vagaId', 'criadoPor', 'titulo'],
    properties: {
      vagaId: { type: 'string', example: 'vaga-001' },
      criadoPor: { type: 'string', example: 'rh@empresa.com' },
      titulo: { type: 'string', example: 'Questionario Tecnico Backend' },
      instrucoes: { type: 'string', example: 'Responda todas as perguntas objetivas.' },
      ativo: { type: 'integer', enum: [0, 1], example: 1 },
    },
    example: {
      vagaId: 'vaga-001',
      criadoPor: 'rh@empresa.com',
      titulo: 'Questionario Tecnico Backend',
      instrucoes: 'Responda todas as perguntas objetivas.',
      ativo: 1,
    },
  },

  QuestionarioUpdateRequest: {
    type: 'object',
    properties: {
      vagaId: { type: 'string', example: 'vaga-001' },
      criadoPor: { type: 'string', example: 'rh@empresa.com' },
      titulo: { type: 'string', example: 'Questionario Tecnico Backend - Atualizado' },
      instrucoes: { type: 'string', example: 'Leia com calma antes de responder.' },
    },
    example: {
      titulo: 'Questionario Tecnico Backend - Atualizado',
      instrucoes: 'Leia com calma antes de responder.',
    },
  },

  QuestionarioAtivoPatchRequest: {
    type: 'object',
    required: ['ativo'],
    properties: {
      ativo: { type: 'integer', enum: [0, 1], example: 0 },
    },
    example: {
      ativo: 0,
    },
  },

  PerguntaCreateRequest: {
    type: 'object',
    required: ['questionarioId', 'enunciado', 'tipoResposta', 'peso', 'ordem'],
    properties: {
      questionarioId: { type: 'string', example: 'quest-001' },
      enunciado: { type: 'string', example: 'Qual destas tecnologias voce domina mais?' },
      tipoResposta: {
        type: 'string',
        enum: ['multipla_escolha', 'dissertativa', 'verdadeiro_falso'],
        example: 'multipla_escolha',
      },
      peso: {
      type: 'number',
      example: 1,
      description:
        'Sempre 1. Campo inerte, mantido por compatibilidade: nenhum service o le e ele nao entra no payload da triagem por IA. O peso que a avaliacao pondera e `peso_percentual`, dos criterios da vaga, e nao tem relacao com este.',
    },
      obrigatoria: { type: 'integer', enum: [0, 1], example: 1 },
      ordem: { type: 'integer', example: 1 },
    },
    example: {
      questionarioId: 'quest-001',
      enunciado: 'Qual destas tecnologias voce domina mais?',
      tipoResposta: 'multipla_escolha',
      peso: 1,
      obrigatoria: 1,
      ordem: 1,
    },
  },

  PerguntaUpdateRequest: {
    type: 'object',
    properties: {
      enunciado: { type: 'string', example: 'Atualizacao do enunciado da pergunta' },
      tipoResposta: {
        type: 'string',
        enum: ['multipla_escolha', 'dissertativa', 'verdadeiro_falso'],
      },
      peso: {
      type: 'number',
      example: 1,
      description:
        'Sempre 1. Campo inerte, mantido por compatibilidade: nenhum service o le e ele nao entra no payload da triagem por IA. O peso que a avaliacao pondera e `peso_percentual`, dos criterios da vaga, e nao tem relacao com este.',
    },
      obrigatoria: { type: 'integer', enum: [0, 1], example: 1 },
      ordem: { type: 'integer', example: 2 },
    },
    example: {
      enunciado: 'Atualizacao do enunciado da pergunta',
      peso: 1,
      ordem: 2,
    },
  },

  OpcaoRespostaCreateRequest: {
    type: 'object',
    required: ['texto', 'ordem'],
    properties: {
      texto: { type: 'string', example: 'MongoDB' },
      correta: { type: 'integer', enum: [0, 1], example: 1 },
      ordem: { type: 'integer', example: 1 },
    },
    example: {
      texto: 'MongoDB',
      correta: 1,
      ordem: 1,
    },
  },

  OpcaoRespostaUpdateRequest: {
    type: 'object',
    properties: {
      texto: { type: 'string', example: 'PostgreSQL' },
      correta: { type: 'integer', enum: [0, 1], example: 0 },
      ordem: { type: 'integer', example: 2 },
    },
    example: {
      texto: 'PostgreSQL',
      correta: 0,
      ordem: 2,
    },
  },

  PerguntaReorderItem: {
    type: 'object',
    required: ['id', 'ordem'],
    properties: {
      id: { type: 'string', example: 'perg-001' },
      ordem: { type: 'integer', example: 1 },
    },
  },

  PerguntaReorderRequest: {
    type: 'object',
    required: ['questionarioId', 'perguntas'],
    properties: {
      questionarioId: { type: 'string', example: 'quest-001' },
      perguntas: {
        type: 'array',
        items: { $ref: '#/components/schemas/PerguntaReorderItem' },
      },
    },
    example: {
      questionarioId: 'quest-001',
      perguntas: [
        { id: 'perg-001', ordem: 2 },
        { id: 'perg-002', ordem: 1 },
      ],
    },
  },

  RespostaQuestionarioIniciarRequest: {
    type: 'object',
    required: ['questionarioId', 'usuarioId'],
    properties: {
      questionarioId: { type: 'string', example: 'quest-001' },
      usuarioId: { type: 'string', example: 'user-001' },
    },
    example: {
      questionarioId: 'quest-001',
      usuarioId: 'user-001',
    },
  },

  RespostaQuestionarioResponderRequest: {
    type: 'object',
    required: ['respostas'],
    properties: {
      respostas: {
        type: 'array',
        items: {
          type: 'object',
          required: ['perguntaId'],
          properties: {
            perguntaId: { type: 'string', example: 'perg-001' },
            textoResposta: { type: 'string', example: 'Resposta aberta do candidato.' },
            opcaoRespostaId: { type: 'string', example: 'opc-001' },
            opcaoRespostaIds: {
              type: 'array',
              items: { type: 'string' },
              example: ['opc-001'],
            },
          },
        },
      },
    },
    example: {
      respostas: [
        {
          perguntaId: 'perg-001',
          opcaoRespostaId: 'opc-001',
        },
        {
          perguntaId: 'perg-002',
          textoResposta: 'Tenho experiencia com Node.js, Express e MongoDB.',
        },
      ],
    },
  },

  QuestionarioSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Questionario criado com sucesso.' },
      data: { $ref: '#/components/schemas/Questionario' },
    },
    example: {
      success: true,
      message: 'Questionario criado com sucesso.',
      data: {
        _id: '680a0b1c2d3e4f5a6b7c8d80',
        id: 'quest-001',
        vagaId: 'vaga-001',
        criadoPor: 'rh@empresa.com',
        titulo: 'Questionario Tecnico Backend',
        instrucoes: 'Responda com atencao e revise antes de finalizar.',
        ativo: 1,
      },
    },
  },

  QuestionarioDetalhadoResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Questionario encontrado com sucesso.' },
      data: { $ref: '#/components/schemas/QuestionarioDetalhado' },
    },
  },

  QuestionarioListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Questionarios listados com sucesso.' },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/Questionario' },
      },
    },
  },

  QuestionarioDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Questionario excluido com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'quest-001' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },

  PerguntaSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Pergunta encontrada com sucesso.' },
      data: { $ref: '#/components/schemas/PerguntaComOpcoes' },
    },
    example: {
      success: true,
      message: 'Pergunta encontrada com sucesso.',
      data: {
        _id: '680a0b1c2d3e4f5a6b7c8d90',
        id: 'perg-001',
        questionarioId: 'quest-001',
        enunciado: 'Qual tecnologia voce domina mais?',
        tipoResposta: 'multipla_escolha',
        peso: 1,
        obrigatoria: 1,
        ordem: 1,
        opcaoResposta: [
          {
            _id: '680a0b1c2d3e4f5a6b7c8d9a',
            id: 'opc-001',
            perguntaId: 'perg-001',
            texto: 'Node.js',
            correta: 1,
            ordem: 1,
          },
        ],
      },
    },
  },

  PerguntaListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Perguntas listadas com sucesso.' },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/PerguntaComOpcoes' },
      },
    },
  },

  PerguntaDeleteResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Pergunta excluida com sucesso.' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'perg-001' },
          deletado: { type: 'boolean', example: true },
        },
      },
    },
  },

  OpcaoRespostaSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Opcao de resposta criada com sucesso.' },
      data: { $ref: '#/components/schemas/OpcaoResposta' },
    },
  },

  RespostaQuestionarioSingleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Resposta de questionario iniciada com sucesso.' },
      data: { $ref: '#/components/schemas/RespostaQuestionario' },
    },
    example: {
      success: true,
      message: 'Resposta de questionario iniciada com sucesso.',
      data: {
        _id: '680a0b1c2d3e4f5a6b7c8db0',
        id: 'resp-quest-001',
        questionarioId: 'quest-001',
        usuarioId: 'user-001',
        status: 'em_andamento',
      },
    },
  },

  RespostaQuestionarioResponderResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Respostas registradas com sucesso.' },
      data: {
        type: 'object',
        properties: {
          respostaQuestionarioId: { type: 'string', example: 'resp-quest-001' },
          respostas: {
            type: 'array',
            items: { $ref: '#/components/schemas/RespostaPergunta' },
          },
        },
      },
    },
  },

  RespostaQuestionarioFinalizarResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Questionario finalizado com sucesso.' },
      data: { $ref: '#/components/schemas/RespostaQuestionario' },
    },
  },

  RespostaQuestionarioDetalheResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Resposta de questionario encontrada com sucesso.' },
      data: { $ref: '#/components/schemas/RespostaQuestionarioDetalhada' },
    },
  },
};

export default questionarioSchemas;

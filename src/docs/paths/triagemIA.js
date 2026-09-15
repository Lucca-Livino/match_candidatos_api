const triagemIAPaths = {
  '/api/vagas/{id}/candidaturas': {
    get: {
      tags: ['Triagem por IA'],
      summary: 'Lista as candidaturas de uma vaga, sem ranking',
      description:
        'Visao do recrutador. Devolve apto/nao apto e a justificativa do modelo, nunca o score bruto. A ordenacao e por criadoEm crescente — ordenar por score reintroduziria o vies de ancoragem que a triagem sem ranking existe para evitar.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Identificador da vaga.',
          schema: { type: 'string' },
          example: '6a910959edabad997a0e8417',
        },
      ],
      responses: {
        200: {
          description: 'Candidaturas listadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidaturaVagaListResponse' },
            },
          },
        },
        401: { description: 'Token ausente ou invalido' },
        403: { description: 'Papel sem permissao (apenas administrador e recrutador)' },
      },
    },
  },

  '/api/vagas/{id}/candidaturas/{usuarioId}/reavaliar': {
    post: {
      tags: ['Triagem por IA'],
      summary: 'Reprocessa a avaliacao de uma candidatura',
      description:
        'Caminho de volta para candidaturas pendentes. O disparo automatico ao finalizar o questionario e fire-and-forget: se o processo cair ou a IA falhar, a candidatura fica com avaliadoEm null e volta por aqui. Nao tem corpo de requisicao.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Identificador da vaga.',
          schema: { type: 'string' },
          example: '6a910959edabad997a0e8417',
        },
        {
          name: 'usuarioId',
          in: 'path',
          required: true,
          description: 'Identificador do candidato.',
          schema: { type: 'string' },
          example: '6a910959edabad997a0e8407',
        },
      ],
      responses: {
        200: {
          description: 'Candidatura reavaliada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidaturaReavaliadaResponse' },
            },
          },
        },
        401: { description: 'Token ausente ou invalido' },
        403: { description: 'Papel sem permissao (apenas administrador, recrutador e suporte)' },
        404: { description: 'Candidatura nao encontrada para este par usuario/vaga' },
        409: {
          description:
            "Candidatura fora de 'inscrito'. Depois da promocao pela IA ou da decisao do recrutador a reavaliacao nao e mais permitida.",
        },
        503: {
          description:
            'Avaliacao por IA indisponivel: a integracao esta desligada ou o modelo nao respondeu. Nada foi gravado.',
        },
      },
    },
  },

  '/api/configuracao-integracao': {
    get: {
      tags: ['Configuracao da IA (Suporte)'],
      summary: 'Le a configuracao da triagem automatica',
      description:
        'Documento unico (singleton) com limiar, provedor, cascata de modelos, temperatura e kill switch. As chaves de API aparecem apenas como booleano em chavesConfiguradas — o valor nunca sai por aqui.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Configuracao obtida com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConfiguracaoIntegracaoResponse' },
            },
          },
        },
        401: { description: 'Token ausente ou invalido' },
        403: {
          description:
            'Papel sem permissao. Apenas o papel suporte acessa esta rota — nem o administrador entra.',
        },
      },
    },
    patch: {
      tags: ['Configuracao da IA (Suporte)'],
      summary: 'Atualiza a configuracao da triagem automatica',
      description:
        'Atualizacao parcial. Baixar o limiar faz candidaturas antes reprovadas passarem na proxima reavaliacao; o limiteAplicado gravado em cada candidatura registra qual limiar valia no momento da avaliacao.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ConfiguracaoIntegracaoUpdateRequest' },
            examples: {
              ajustarLimiar: {
                summary: 'Ajustar o limiar de corte',
                value: { limiteCompatibilidade: 0.65 },
              },
              desligarIntegracao: {
                summary: 'Kill switch — para a triagem sem derrubar o fluxo',
                value: { ativo: false },
              },
              reordenarCascata: {
                summary: 'Reordenar a cascata de modelos',
                value: { cascata: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Configuracao atualizada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConfiguracaoIntegracaoResponse' },
            },
          },
        },
        400: {
          description:
            'Payload invalido: limiar ou temperatura fora de 0..1, provedor desconhecido, cascata vazia, com mais de 4 degraus ou com modelo repetido.',
        },
        401: { description: 'Token ausente ou invalido' },
        403: { description: 'Papel sem permissao (apenas suporte)' },
      },
    },
  },
};

export default triagemIAPaths;

const CandidaturaAvaliada = {
  type: 'object',
  description:
    'Candidatura na visao do recrutador. Nenhum campo da triagem sai aqui (score, limiar, veredito, motivo, justificativa, criterios, modelo, data da avaliacao) — so o papel suporte os ve, em GET /api/avaliacoes. A triagem chega ao recrutador apenas como fila: candidatura compativel ja esta em em_analise.',
  properties: {
    id: { type: 'string', example: '2df05e6e-4e1e-4dd1-a596-a34ebce6ddea' },
    usuarioId: { type: 'string', example: '6a910959edabad997a0e8407' },
    vagaId: { type: 'string', example: '6a910959edabad997a0e8417' },
    status: {
      type: 'string',
      enum: ['inscrito', 'em_analise', 'aprovado', 'reprovado'],
      example: 'em_analise',
    },
    movidoPor: {
      type: 'string',
      enum: ['sistema', 'recrutador'],
      description:
        'Origem da ultima movimentacao. A promocao feita pela triagem sai como sistema: expor a origem ia revelaria o veredito.',
      example: 'sistema',
    },
    candidato: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string' },
        nome: { type: 'string', example: 'Diego Candidato' },
        email: { type: 'string', example: 'diego.candidato@match.com' },
        telefone: { type: 'string' },
        linkedin: { type: 'string' },
        cidade: { type: 'string' },
      },
    },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
  },
};

const AvaliacaoAuditoria = {
  type: 'object',
  description:
    'Candidatura na visao do SUPORTE, com todo o registro da triagem. E a unica saida da API que expoe estes campos.',
  properties: {
    id: { type: 'string', example: '2df05e6e-4e1e-4dd1-a596-a34ebce6ddea' },
    usuarioId: { type: 'string', example: '6a910959edabad997a0e8407' },
    vagaId: { type: 'string', example: '6a910959edabad997a0e8417' },
    scoreIA: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      nullable: true,
      description: 'Score bruto da triagem. 0 quando o gate de obrigatorios barrou sem chamar o modelo.',
      example: 0.75,
    },
    limiteAplicado: {
      type: 'number',
      nullable: true,
      description: 'Limiar que valia no momento da avaliacao.',
      example: 0.7,
    },
    compativel: {
      type: 'integer',
      enum: [0, 1],
      description:
        'Resultado da triagem: 1 = apto, 0 = nao apto. Enquanto avaliadoEm for null este campo carrega o default do schema (1) e nao representa uma avaliacao.',
      example: 0,
    },
    motivoIncompat_: {
      type: 'string',
      description:
        'Preenchido apenas quando compativel = 0. Distingue reprovacao no gate deterministico de reprovacao pelo limiar.',
      example: 'Compatibilidade abaixo do limiar definido para a triagem automatica.',
    },
    justificativa: {
      type: 'string',
      description: 'Texto produzido pelo modelo explicando a aderencia do perfil.',
      example:
        'O candidato demonstra forte dominio tecnico em React e experiencia pratica relevante com otimizacao de build.',
    },
    criteriosAvaliados: {
      type: 'array',
      description:
        'Nota e evidencia dadas pelo modelo a cada criterio da vaga, com nome e peso copiados no momento da avaliacao. Vazio quando a candidatura foi barrada no gate, sem chamada ao modelo.',
      items: {
        type: 'object',
        properties: {
          criterioId: { type: 'string' },
          nome: { type: 'string', example: 'React' },
          peso: { type: 'number', example: 40 },
          obrigatorio: { type: 'boolean' },
          aderencia: { type: 'number', minimum: 0, maximum: 1, example: 1 },
          evidencia: { type: 'string', example: 'Nivel especialista em React e lideranca tecnica.' },
          atendido: { type: 'boolean' },
          omitido: { type: 'boolean', description: 'O modelo nao deu nota; entrou como 0 no score.' },
        },
      },
    },
    versaoModelo: {
      type: 'string',
      nullable: true,
      description:
        'Provedor e modelo que DE FATO respondeu, no formato provedor/modelo. Pode nao ser o primeiro degrau da cascata se a cota do principal tiver se esgotado. null quando a IA nao foi chamada.',
      example: 'gemini/gemini-3.1-flash-lite',
    },
    avaliadoEm: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description:
        'null significa pendente: a integracao esta desligada ou a IA falhou. A candidatura pode ser reprocessada pela rota de reavaliacao.',
      example: '2026-08-28T04:19:18.006Z',
    },
    status: {
      type: 'string',
      enum: ['inscrito', 'em_analise', 'aprovado', 'reprovado'],
      example: 'inscrito',
    },
    movidoPor: {
      type: 'string',
      enum: ['sistema', 'recrutador', 'ia'],
      description: 'Aqui a origem ia aparece: candidatura promovida pela triagem.',
      example: 'ia',
    },
    candidato: {
      type: 'object',
      nullable: true,
      properties: {
        nome: { type: 'string', example: 'Diego Candidato' },
        email: { type: 'string', example: 'diego.candidato@match.com' },
      },
    },
    vaga: {
      type: 'object',
      nullable: true,
      properties: { titulo: { type: 'string', example: 'Desenvolvedor Front-end' } },
    },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
  },
};

const AvaliacaoAuditoriaListResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Avaliacoes listadas com sucesso.' },
    data: {
      type: 'array',
      description: 'Ordenada por avaliadoEm decrescente; pendentes (avaliadoEm null) vao para o fim.',
      items: { $ref: '#/components/schemas/AvaliacaoAuditoria' },
    },
  },
};

const CandidaturaVagaListResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Candidaturas da vaga listadas com sucesso.' },
    data: {
      type: 'array',
      description:
        'Ordenada por criadoEm crescente. A ordem e deliberadamente neutra: ordenar por score reintroduziria o vies de ancoragem que a triagem sem ranking existe para evitar.',
      items: { $ref: '#/components/schemas/CandidaturaAvaliada' },
    },
  },
};

const CandidaturaReavaliadaResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Candidatura reavaliada com sucesso.' },
    data: { $ref: '#/components/schemas/CandidaturaAvaliada' },
  },
};

const ConfiguracaoIntegracao = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'e2b1c9d4-1f3a-4c88-9a77-1b0f2d3e4a5b' },
    limiteCompatibilidade: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Limiar de corte. Score do modelo >= limiar significa apto.',
      example: 0.7,
    },
    provedor: {
      type: 'string',
      enum: ['gemini'],
      description: 'Estrategia de avaliacao em uso. A lista tem um item so desde a saida do Groq.',
      example: 'gemini',
    },
    cascata: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 4,
      description:
        'Lista ORDENADA de modelos. O degrau seguinte so e acionado quando o anterior se esgota — por cota diaria, por tentativas de retry esgotadas ou por resposta invalida. Nunca por erro deterministico (400/401/403/404), que aborta a cascata. Nao aceita modelo repetido.',
      example: ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'],
    },
    temperatura: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: '0 = maxima reprodutibilidade, o que ajuda na calibracao do limiar.',
      example: 0,
    },
    ativo: {
      type: 'boolean',
      description:
        'Kill switch. Com false, finalizar um questionario nao dispara avaliacao: a candidatura fica pendente e e reprocessavel depois.',
      example: true,
    },
    chavesConfiguradas: {
      type: 'object',
      description:
        'Status das chaves de API, sempre como booleano. As chaves vivem apenas em variavel de ambiente e o valor nunca sai por esta rota.',
      properties: {
        gemini: { type: 'boolean', example: true },
      },
    },
    atualizadoPor: { type: 'string', example: 'carla.suporte@match.com' },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
  },
};

const ConfiguracaoIntegracaoResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Configuracao de integracao obtida com sucesso.' },
    data: { $ref: '#/components/schemas/ConfiguracaoIntegracao' },
  },
};

const ConfiguracaoIntegracaoUpdateRequest = {
  type: 'object',
  description: 'Todos os campos sao opcionais; ao menos um precisa ser informado.',
  properties: {
    limiteCompatibilidade: { type: 'number', minimum: 0, maximum: 1, example: 0.65 },
    provedor: { type: 'string', enum: ['gemini'], example: 'gemini' },
    cascata: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 4,
      example: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
    },
    temperatura: { type: 'number', minimum: 0, maximum: 1, example: 0 },
    ativo: { type: 'boolean', example: true },
  },
};

const triagemIASchemas = {
  CandidaturaAvaliada,
  AvaliacaoAuditoria,
  AvaliacaoAuditoriaListResponse,
  CandidaturaVagaListResponse,
  CandidaturaReavaliadaResponse,
  ConfiguracaoIntegracao,
  ConfiguracaoIntegracaoResponse,
  ConfiguracaoIntegracaoUpdateRequest,
};

export default triagemIASchemas;

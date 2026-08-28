// Regras de acesso por caminho (sem prefixo /api) -> metodo -> { roles, allowSelf }.
// allowSelf: libera quando match[1] (id na URL) === id do usuario autenticado.
const ADMIN = 'administrador';
const RECRUTADOR = 'recrutador';
const CANDIDATO = 'candidato';
const SUPORTE = 'suporte';

const politicasAcesso = [
  // Configuracao das integracoes: exclusiva do suporte (segregacao de funcoes).
  {
    pattern: /^\/configuracao-integracao(?:\/.*)?$/,
    methods: {
      GET: { roles: [SUPORTE] },
      PATCH: { roles: [SUPORTE] },
    },
  },
  // Curriculo do proprio usuario
  {
    pattern: /^\/usuarios\/([^/]+)\/(formacao|experiencia|habilidade|certificacao)(?:\/|$)/,
    methods: { '*': { roles: [ADMIN], allowSelf: true } },
  },
  // Status da candidatura (acao do recrutador/admin)
  {
    pattern: /^\/usuarios\/([^/]+)\/candidatura\/[^/]+\/status(?:\/|$)/,
    methods: { PATCH: { roles: [ADMIN, RECRUTADOR] } },
  },
  // Candidatura do proprio usuario
  {
    pattern: /^\/usuarios\/([^/]+)\/candidatura(?:\/|$)/,
    methods: { '*': { roles: [ADMIN], allowSelf: true } },
  },
  // Usuario individual (registro publico e liberado no app.js, nao passa aqui)
  {
    pattern: /^\/usuarios\/([^/]+)(?:\/|$)/,
    methods: {
      GET: { roles: [ADMIN], allowSelf: true },
      PATCH: { roles: [ADMIN], allowSelf: true },
      DELETE: { roles: [ADMIN] },
    },
  },
  // Colecao de usuarios
  {
    pattern: /^\/usuarios(?:\/?$)/,
    // Recrutador lista usuarios para a tela de candidatos; criar continua restrito ao admin.
    methods: { GET: { roles: [ADMIN, RECRUTADOR] }, POST: { roles: [ADMIN] } },
  },
  // Candidaturas de uma vaga (visao do recrutador) e reavaliacao manual.
  // Precisam vir antes do bloco generico de /vagas.
  {
    pattern: /^\/vagas\/[^/]+\/candidaturas(?:\/?$)/,
    methods: { GET: { roles: [ADMIN, RECRUTADOR] } },
  },
  {
    pattern: /^\/vagas\/[^/]+\/candidaturas\/[^/]+\/reavaliar(?:\/?$)/,
    methods: { POST: { roles: [ADMIN, RECRUTADOR] } },
  },
  // Vagas
  {
    pattern: /^\/vagas(?:\/[^/]+)?(?:\/?$)/,
    methods: {
      GET: { roles: [ADMIN, RECRUTADOR, CANDIDATO] },
      POST: { roles: [ADMIN, RECRUTADOR] },
      PATCH: { roles: [ADMIN, RECRUTADOR] },
      DELETE: { roles: [ADMIN, RECRUTADOR] },
    },
  },
  // Questionario
  {
    pattern: /^\/questionario(?:\/.*)?$/,
    methods: {
      GET: { roles: [ADMIN, RECRUTADOR, CANDIDATO] },
      POST: { roles: [ADMIN, RECRUTADOR] },
      PUT: { roles: [ADMIN, RECRUTADOR] },
      PATCH: { roles: [ADMIN, RECRUTADOR] },
      DELETE: { roles: [ADMIN, RECRUTADOR] },
    },
  },
  // Pergunta
  {
    pattern: /^\/pergunta(?:\/.*)?$/,
    methods: { '*': { roles: [ADMIN, RECRUTADOR] } },
  },
  // Resposta de questionario
  {
    pattern: /^\/resposta-questionario(?:\/.*)?$/,
    methods: { '*': { roles: [ADMIN, CANDIDATO] } },
  },
  // Me
  {
    pattern: /^\/me(?:\/?$)/,
    methods: { GET: { roles: [ADMIN, RECRUTADOR, CANDIDATO] } },
  },
  // CRUD administrativo
  {
    pattern: /^\/rotas(?:\/.*)?$/,
    methods: { '*': { roles: [ADMIN] } },
  },
  {
    pattern: /^\/grupos(?:\/.*)?$/,
    methods: { '*': { roles: [ADMIN] } },
  },
];

export default politicasAcesso;

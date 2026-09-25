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
  // Auditoria da triagem: exclusiva do suporte. E a unica rota que devolve
  // scoreIA/limiteAplicado — por isso nao inclui ADMIN nem RECRUTADOR.
  {
    pattern: /^\/avaliacoes(?:\/?$)/,
    methods: {
      GET: { roles: [SUPORTE] },
    },
  },
  // Curriculo do proprio usuario. O recrutador so le: o detalhe do candidato
  // na tela de candidatos carrega as quatro secoes; editar segue com o dono.
  {
    pattern: /^\/usuarios\/([^/]+)\/(formacao|experiencia|habilidade|certificacao)(?:\/|$)/,
    methods: {
      GET: { roles: [ADMIN, RECRUTADOR], allowSelf: true },
      '*': { roles: [ADMIN], allowSelf: true },
    },
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
  // Autoexclusao da propria conta. Vale para todo papel e precisa vir antes do
  // bloco de /usuarios/:id, que casaria com 'me' e restringiria o DELETE ao
  // administrador. Nao usa allowSelf: o alvo nao esta na URL, vem da sessao.
  {
    pattern: /^\/usuarios\/me(?:\/?$)/,
    methods: {
      DELETE: { roles: [ADMIN, RECRUTADOR, CANDIDATO, SUPORTE] },
    },
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
    // SUPORTE entra aqui porque e o unico papel que enxerga a pendencia da
    // triagem (/avaliacoes) e portanto o unico que sabe que ha o que reprocessar.
    methods: { POST: { roles: [ADMIN, RECRUTADOR, SUPORTE] } },
  },
  // Ficha de impressao: contato, curriculo e respostas de UMA candidatura.
  // Sai sem nenhum campo da triagem, por isso vale para os tres papeis internos.
  {
    pattern: /^\/vagas\/[^/]+\/candidaturas\/[^/]+\/ficha(?:\/?$)/,
    methods: { GET: { roles: [ADMIN, RECRUTADOR, SUPORTE] } },
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
  // Me: identidade do usuario logado. Precisa valer para TODO papel — e por
  // aqui que o front descobre `tipos_permissao` para decidir a area. Um papel
  // fora desta lista consegue autenticar mas nao consegue navegar: o
  // RoleLayout nao recebe o papel e devolve a pessoa para a tela de login.
  {
    pattern: /^\/me(?:\/?$)/,
    methods: { GET: { roles: [ADMIN, RECRUTADOR, CANDIDATO, SUPORTE] } },
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

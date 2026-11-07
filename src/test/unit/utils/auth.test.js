const mockMongo = { connection: undefined };

jest.mock('better-auth', () => ({ betterAuth: jest.fn((config) => ({ config })) }));
jest.mock('better-auth/adapters/mongodb', () => ({ mongodbAdapter: jest.fn((db) => ({ db })) }));
jest.mock('better-auth/plugins', () => ({ bearer: jest.fn(() => 'bearer') }));
jest.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(status, body) {
      super(body.message);
      this.status = status;
      this.body = body;
    }
  },
}));
jest.mock('mongoose', () => {
  const { Types } = jest.requireActual('mongoose');
  return {
    __esModule: true,
    default: {
      Types,
      get connection() {
        return mockMongo.connection;
      },
    },
  };
});

const VARIAVEIS = [
  'NODE_ENV',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_TRUSTED_ORIGINS',
  'APP_PORT',
  'API_PORT',
];

const carregar = async (env = {}) => {
  Object.assign(process.env, env);
  let modulo;
  await jest.isolateModulesAsync(async () => {
    modulo = await import('../../../utils/auth.js');
  });
  return modulo.auth.config;
};

describe('auth', () => {
  const original = { ...process.env };
  let findOne;

  beforeEach(() => {
    VARIAVEIS.forEach((v) => delete process.env[v]);
    findOne = jest.fn();
    mockMongo.connection = { db: { collection: jest.fn(() => ({ findOne })) } };
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it.each([
    ['sem conexão', undefined],
    ['sem db', {}],
  ])('falha ao carregar %s com o MongoDB', async (_, connection) => {
    mockMongo.connection = connection;

    await expect(carregar()).rejects.toThrow('Conexao MongoDB nao inicializada');
  });

  it('exige BETTER_AUTH_SECRET em produção', async () => {
    await expect(carregar({ NODE_ENV: 'production' })).rejects.toThrow('BETTER_AUTH_SECRET deve ser definida');
  });

  it('em produção usa o segredo definido e desliga o login automático', async () => {
    const config = await carregar({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'segredo' });

    expect(config.secret).toBe('segredo');
    expect(config.emailAndPassword.autoSignIn).toBe(false);
  });

  it('usa os padrões de desenvolvimento sem variáveis definidas', async () => {
    const config = await carregar();

    expect(config).toMatchObject({
      secret: 'dev-secret-change-me',
      baseURL: 'http://localhost:5000',
      basePath: '/api/auth',
      database: { db: mockMongo.connection.db },
      plugins: ['bearer'],
      emailAndPassword: { enabled: true, autoSignIn: true },
      trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    });
  });

  it('usa BETTER_AUTH_URL como baseURL', async () => {
    const config = await carregar({ BETTER_AUTH_URL: 'https://api.exemplo.com', APP_PORT: '9000' });

    expect(config.baseURL).toBe('https://api.exemplo.com');
  });

  it.each([
    [{ APP_PORT: '7000', API_PORT: '8000' }, 'http://localhost:7000'],
    [{ API_PORT: '8000' }, 'http://localhost:8000'],
  ])('monta a baseURL pela porta %j', async (env, esperado) => {
    expect((await carregar(env)).baseURL).toBe(esperado);
  });

  it('separa as origens confiáveis e descarta vazias', async () => {
    const config = await carregar({ BETTER_AUTH_TRUSTED_ORIGINS: ' https://a.com , ,https://b.com' });

    expect(config.trustedOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  describe('criação de sessão', () => {
    const criarSessao = async (session) => (await carregar()).databaseHooks.session.create.before(session);

    it('barra a sessão de conta desativada', async () => {
      findOne.mockResolvedValue({ status_ativo: false });

      await expect(criarSessao({ userId: '507f1f77bcf86cd799439011' })).rejects.toMatchObject({
        status: 'FORBIDDEN',
        body: { code: 'CONTA_DESATIVADA' },
      });
      expect(mockMongo.connection.db.collection).toHaveBeenCalledWith('usuarios');
      const [[filtro, opcoes]] = findOne.mock.calls;
      expect(String(filtro._id)).toBe('507f1f77bcf86cd799439011');
      expect(typeof filtro._id).toBe('object');
      expect(opcoes).toEqual({ projection: { status_ativo: 1 } });
    });

    it.each([
      ['ativa', { status_ativo: true }],
      ['sem status', {}],
      ['inexistente', null],
    ])('libera a sessão de conta %s', async (_, usuario) => {
      findOne.mockResolvedValue(usuario);

      await expect(criarSessao({ userId: '507f1f77bcf86cd799439011' })).resolves.toBeUndefined();
    });

    it('consulta pelo id cru quando ele não é ObjectId', async () => {
      findOne.mockResolvedValue(null);

      await criarSessao({ userId: 'id-externo' });
      expect(findOne).toHaveBeenCalledWith({ _id: 'id-externo' }, expect.any(Object));
    });
  });
});

import getSwaggerOptions from './head.js';

describe('getSwaggerOptions', () => {
  const ambienteOriginal = { ...process.env };

  beforeEach(() => {
    delete process.env.SWAGGER_PROD_URL;
    delete process.env.SWAGGER_DEV_URL;
  });

  afterEach(() => {
    process.env = { ...ambienteOriginal };
  });

  it('em desenvolvimento lista o servidor de dev primeiro', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SWAGGER_DEV_URL = 'http://dev';
    process.env.SWAGGER_PROD_URL = 'http://prod';

    const { definition } = await getSwaggerOptions();

    expect(definition.servers).toEqual([{ url: 'http://dev' }, { url: 'http://prod' }]);
  });

  it('fora de desenvolvimento lista produção primeiro, com localhost como padrão', async () => {
    process.env.NODE_ENV = 'production';

    const { definition } = await getSwaggerOptions();

    expect(definition.servers).toEqual([{ url: 'http://localhost:5000' }, { url: 'http://localhost:5000' }]);
  });

  it('reúne paths e schemas de todos os módulos', async () => {
    process.env.NODE_ENV = 'test';

    const options = await getSwaggerOptions();

    expect(options.apis).toEqual(['./src/routes/*.js']);
    expect(options.definition.paths).toHaveProperty(['/api/rotas']);
    expect(options.definition.components.schemas).toHaveProperty('Rota');
    expect(options.definition.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });
});

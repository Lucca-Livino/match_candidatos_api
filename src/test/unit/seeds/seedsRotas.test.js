import DbConnect from '../../../config/dbconnect.js';
import Rota from '../../../models/Rota.js';
import seedRotas, { rotasSeed } from '../../../seeds/seedsRotas.js';

jest.mock('dotenv/config', () => ({}));
jest.mock('../../../config/dbconnect.js', () => ({
  __esModule: true,
  default: { conectar: jest.fn(), desconectar: jest.fn() },
}));
jest.mock('../../../models/Rota.js', () => ({
  __esModule: true,
  default: { findOneAndUpdate: jest.fn() },
}));

describe('seedRotas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Rota.findOneAndUpdate.mockResolvedValue({});
  });

  it.each([
    ['sem opções', undefined],
    ['com opções vazias', {}],
    ['com conexão própria', { useOwnConnection: true }],
  ])('%s abre e fecha a própria conexão', async (_, opcoes) => {
    await seedRotas(opcoes);

    expect(DbConnect.conectar).toHaveBeenCalledTimes(1);
    expect(DbConnect.desconectar).toHaveBeenCalledTimes(1);
  });

  it('usa a conexão existente quando useOwnConnection é false', async () => {
    await seedRotas({ useOwnConnection: false });

    expect(DbConnect.conectar).not.toHaveBeenCalled();
    expect(DbConnect.desconectar).not.toHaveBeenCalled();
  });

  it('faz upsert de cada rota por route e domain', async () => {
    await seedRotas({ useOwnConnection: false });

    expect(Rota.findOneAndUpdate).toHaveBeenCalledTimes(rotasSeed.length);
    const [r] = rotasSeed;
    expect(Rota.findOneAndUpdate).toHaveBeenCalledWith(
      { route: r.route, domain: r.domain },
      { $set: r },
      { upsert: true, new: true },
    );
  });

  it('fecha a conexão mesmo quando o upsert falha', async () => {
    Rota.findOneAndUpdate.mockRejectedValueOnce(new Error('falhou'));

    await expect(seedRotas()).rejects.toThrow('falhou');
    expect(DbConnect.desconectar).toHaveBeenCalledTimes(1);
  });
});

describe('domínio das rotas', () => {
  const original = process.env.PERMISSION_DOMAIN;

  afterEach(() => {
    if (original === undefined) delete process.env.PERMISSION_DOMAIN;
    else process.env.PERMISSION_DOMAIN = original;
  });

  const carregarSeed = () => {
    let modulo;
    jest.isolateModules(() => {
      modulo = require('../../../seeds/seedsRotas.js');
    });
    return modulo.rotasSeed;
  };

  it('usa PERMISSION_DOMAIN quando definida', () => {
    process.env.PERMISSION_DOMAIN = 'exemplo.com';

    expect(carregarSeed().every((r) => r.domain === 'exemplo.com')).toBe(true);
  });

  it('usa localhost quando PERMISSION_DOMAIN não está definida', () => {
    delete process.env.PERMISSION_DOMAIN;

    expect(carregarSeed().every((r) => r.domain === 'localhost')).toBe(true);
  });
});

import bcrypt from 'bcrypt';
import { hashPassword } from './password.js';

describe('hashPassword', () => {
  const original = process.env.BCRYPT_SALT_ROUNDS;

  beforeEach(() => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hash');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (original === undefined) delete process.env.BCRYPT_SALT_ROUNDS;
    else process.env.BCRYPT_SALT_ROUNDS = original;
  });

  it('usa 10 rodadas quando BCRYPT_SALT_ROUNDS não está definida', async () => {
    delete process.env.BCRYPT_SALT_ROUNDS;

    await expect(hashPassword('segredo')).resolves.toBe('hash');
    expect(bcrypt.hash).toHaveBeenCalledWith('segredo', 10);
  });

  it.each([
    ['4', 4],
    ['12', 12],
    ['15', 15],
  ])('usa o valor configurado %s dentro do intervalo', async (valor, esperado) => {
    process.env.BCRYPT_SALT_ROUNDS = valor;

    await hashPassword('segredo');
    expect(bcrypt.hash).toHaveBeenCalledWith('segredo', esperado);
  });

  it.each(['abc', '3', '16'])('volta para 10 rodadas quando o valor é %s', async (valor) => {
    process.env.BCRYPT_SALT_ROUNDS = valor;

    await hashPassword('segredo');
    expect(bcrypt.hash).toHaveBeenCalledWith('segredo', 10);
  });
});

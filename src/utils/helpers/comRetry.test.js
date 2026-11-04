import { comRetry, ErroDeCotaDiaria } from './comRetry.js';

const semEspera = () => Promise.resolve();
const erroCom = (status) => Object.assign(new Error('falhou'), { status });
const erroRPD = () =>
  Object.assign(new Error('Quota exceeded'), {
    status: 429,
    error: { code: 429, details: [{ violations: [{ quotaId: 'GenerateRequestsPerDay' }] }] },
  });

describe('comRetry', () => {
  it('devolve o resultado na primeira tentativa bem-sucedida', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(comRetry(fn, { dormir: semEspera })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('repete em 429 de minuto e devolve quando passa', async () => {
    const fn = jest.fn().mockRejectedValueOnce(erroCom(429)).mockResolvedValue('ok');
    await expect(comRetry(fn, { dormir: semEspera })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('nao repete em erro de validacao (400)', async () => {
    const fn = jest.fn().mockRejectedValue(erroCom(400));
    await expect(comRetry(fn, { dormir: semEspera })).rejects.toThrow('falhou');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('nao repete cota diaria: lanca ErroDeCotaDiaria na primeira tentativa', async () => {
    const fn = jest.fn().mockRejectedValue(erroRPD());
    await expect(comRetry(fn, { dormir: semEspera })).rejects.toThrow(ErroDeCotaDiaria);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respeita o retryDelay da API quando ele e maior que a progressao', async () => {
    const esperas = [];
    const erro = Object.assign(new Error('Quota exceeded'), {
      status: 429,
      error: { code: 429, details: [{ retryDelay: '30s' }] },
    });
    const fn = jest.fn().mockRejectedValueOnce(erro).mockResolvedValue('ok');
    await comRetry(fn, { dormir: (ms) => { esperas.push(ms); return Promise.resolve(); } });
    expect(esperas).toEqual([30000]);
  });

  it('desiste depois do numero maximo de tentativas', async () => {
    const fn = jest.fn().mockRejectedValue(erroCom(429));
    await expect(comRetry(fn, { tentativas: 3, dormir: semEspera })).rejects.toThrow('falhou');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

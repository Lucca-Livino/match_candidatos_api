import { classificarErroIA, statusDoErro } from '../../../../utils/helpers/classificarErroIA.js';

describe('statusDoErro', () => {
  it.each([
    ['nulo', null, null],
    ['texto', 'falhou', null],
    ['status', { status: 503 }, 503],
    ['statusCode', { statusCode: 502 }, 502],
    ['code numérico', { code: 429 }, 429],
    ['response.status', { response: { status: 504 } }, 504],
    ['error.code', { error: { code: 400 } }, 400],
    ['número na mensagem', { message: 'got status 503 Service Unavailable' }, 503],
    ['mensagem sem número', { message: 'falha qualquer' }, null],
    ['code textual sem mensagem', { code: 'ECONNRESET', response: {} }, null],
  ])('%s', (_, erro, esperado) => {
    expect(statusDoErro(erro)).toBe(esperado);
  });
});

describe('classificarErroIA', () => {
  it.each([
    ['cota diária na mensagem', { status: 429, message: 'Quota exceeded per day' }],
    ['cota diária em error.details', { status: 429, error: { details: [{ quotaId: 'GenerateRequestsPerDay' }] } }],
    ['cota diária em details', { status: 429, details: [{ quotaId: 'PerDayLimit' }] }],
  ])('escala quando há %s', (_, erro) => {
    expect(classificarErroIA(erro)).toEqual({
      status: 429,
      acao: 'escalar',
      motivo: 'cota diaria (RPD) esgotada',
      atrasoSugeridoMs: null,
    });
  });

  it.each([
    [429, 'limite de taxa (RPM)'],
    [500, 'erro transitorio do servidor'],
    [503, 'erro transitorio do servidor'],
  ])('repete o status %i', (status, motivo) => {
    expect(classificarErroIA({ status })).toEqual({ status, acao: 'repetir', motivo, atrasoSugeridoMs: null });
  });

  it.each([400, 401, 404])('desiste do status determinístico %i', (status) => {
    expect(classificarErroIA({ status })).toMatchObject({ status, acao: 'desistir', motivo: 'erro deterministico' });
  });

  it.each([
    ['AbortError', Object.assign(new Error('abortado'), { name: 'AbortError' })],
    ['TimeoutError', Object.assign(new Error('x'), { name: 'TimeoutError' })],
    ['código de rede', { code: 'ECONNRESET' }],
    ['código de rede na causa', { cause: { code: 'UND_ERR_SOCKET' } }],
    ['mensagem de rede', new TypeError('fetch failed')],
    ['mensagem de timeout', { message: 'Request timed out' }],
  ])('repete falha de rede sem status (%s)', (_, erro) => {
    expect(classificarErroIA(erro)).toMatchObject({
      status: null,
      acao: 'repetir',
      motivo: 'falha de rede sem status',
    });
  });

  it.each([
    ['nulo', null],
    ['texto', 'falhou'],
    ['TypeError de defeito', new TypeError('x is not a function')],
    ['código desconhecido', { code: 'EOUTRO', cause: { code: 42 } }],
    ['objeto vazio', {}],
  ])('desiste de erro sem status que não é de rede (%s)', (_, erro) => {
    expect(classificarErroIA(erro)).toMatchObject({
      status: null,
      acao: 'desistir',
      motivo: 'erro sem status (provavel defeito)',
    });
  });

  it.each([
    ['error.details', { status: 503, error: { details: [{ retryDelay: '12s' }] } }, 12000],
    ['details', { status: 503, details: [{ retryDelay: '1.5s' }] }, 1500],
    ['mensagem', { status: 503, message: '{"retryDelay":"30s"}' }, 30000],
  ])('extrai o atraso sugerido de %s', (_, erro, esperado) => {
    expect(classificarErroIA(erro).atrasoSugeridoMs).toBe(esperado);
  });
});

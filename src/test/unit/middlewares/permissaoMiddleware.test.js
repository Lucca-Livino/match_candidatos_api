import { jest } from '@jest/globals';
import { permissaoMiddleware } from '../../../middlewares/permissaoMiddleware.js';
import PermissaoService from '../../../service/PermissaoService.js';
import AppError from '../../../utils/helpers/AppError.js';

jest.mock('../../../service/PermissaoService.js', () => ({ __esModule: true, default: jest.fn() }));

function mockReqRes(over = {}) {
  const req = { path: '/vagas', method: 'GET', user_id: 'u1', ...over };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

const servicoQueResolve = (resultado) => ({ verificarPermissao: jest.fn().mockResolvedValue(resultado) });

describe('permissaoMiddleware', () => {
  it('chama next() sem erro quando permitido', async () => {
    const service = { verificarPermissao: jest.fn().mockResolvedValue({ ok: true }) };
    const mw = permissaoMiddleware(service);
    const { req, res, next } = mockReqRes();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('chama next(AppError 403) quando negado', async () => {
    const service = { verificarPermissao: jest.fn().mockResolvedValue({ ok: false, status: 403, code: 'FORBIDDEN' }) };
    const mw = permissaoMiddleware(service);
    const { req, res, next } = mockReqRes();
    await mw(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it('consulta o serviço com usuário, caminho, método e domínio padrão', async () => {
    const service = servicoQueResolve({ ok: true });
    const { req, res, next } = mockReqRes({ path: '/vagas/1', method: 'DELETE', user_id: 'u9' });

    await permissaoMiddleware(service)(req, res, next);

    expect(service.verificarPermissao).toHaveBeenCalledWith({
      usuarioId: 'u9',
      caminho: '/vagas/1',
      metodoHttp: 'DELETE',
      dominio: 'localhost',
    });
  });

  it('usa o domínio da variável de ambiente quando definida', async () => {
    const anterior = process.env.PERMISSION_DOMAIN;
    process.env.PERMISSION_DOMAIN = 'app.exemplo.com';
    let middlewareIsolado;
    jest.isolateModules(() => {
      middlewareIsolado = require('../../../middlewares/permissaoMiddleware.js').permissaoMiddleware;
    });
    if (anterior === undefined) delete process.env.PERMISSION_DOMAIN;
    else process.env.PERMISSION_DOMAIN = anterior;
    const service = servicoQueResolve({ ok: true });
    const { req, res, next } = mockReqRes();

    await middlewareIsolado(service)(req, res, next);

    expect(service.verificarPermissao).toHaveBeenCalledWith(expect.objectContaining({ dominio: 'app.exemplo.com' }));
  });

  it('instancia o PermissaoService padrão quando nenhum serviço é injetado', async () => {
    const padrao = servicoQueResolve({ ok: true });
    PermissaoService.mockImplementation(() => padrao);
    const { req, res, next } = mockReqRes();

    await permissaoMiddleware()(req, res, next);

    expect(PermissaoService).toHaveBeenCalledTimes(1);
    expect(padrao.verificarPermissao).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['ROUTE_NOT_FOUND', 404, 'Rota não encontrada.'],
    ['ROUTE_DISABLED', 403, 'Rota indisponível.'],
    ['USER_NOT_FOUND', 404, 'Usuário não encontrado.'],
    ['METHOD_NOT_ALLOWED', 405, 'Método não permitido.'],
  ])('traduz o código %s na mensagem correspondente', async (code, status, mensagem) => {
    const { req, res, next } = mockReqRes();

    await permissaoMiddleware(servicoQueResolve({ ok: false, status, code }))(req, res, next);

    expect(next.mock.calls[0][0]).toMatchObject({ constructor: AppError, message: mensagem, statusCode: status, code });
  });

  it.each([
    ['sem status nem código', { ok: false }, 403, 'FORBIDDEN'],
    ['com código desconhecido', { ok: false, status: 409, code: 'OUTRO' }, 409, 'OUTRO'],
  ])('nega com a mensagem padrão %s', async (_caso, resultado, statusCode, code) => {
    const { req, res, next } = mockReqRes();

    await permissaoMiddleware(servicoQueResolve(resultado))(req, res, next);

    expect(next.mock.calls[0][0]).toMatchObject({
      constructor: AppError,
      message: 'Acesso negado. Você não tem permissão para realizar esta ação.',
      statusCode,
      code,
    });
  });

  it('repassa ao next o erro lançado pelo serviço', async () => {
    const erro = new Error('banco fora do ar');
    const service = { verificarPermissao: jest.fn().mockRejectedValue(erro) };
    const { req, res, next } = mockReqRes();

    await permissaoMiddleware(service)(req, res, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});

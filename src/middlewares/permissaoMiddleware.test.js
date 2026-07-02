import { jest } from '@jest/globals';
import { permissaoMiddleware } from './permissaoMiddleware.js';
import AppError from '../utils/helpers/AppError.js';

function mockReqRes(over = {}) {
  const req = { path: '/vagas', method: 'GET', user_id: 'u1', ...over };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

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
});

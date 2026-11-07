import { fromNodeHeaders } from 'better-auth/node';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { auth } from '../../../utils/auth.js';
import Usuario from '../../../models/Usuario.js';

jest.mock('better-auth/node', () => ({ __esModule: true, fromNodeHeaders: jest.fn((headers) => ({ convertidos: headers })) }));
jest.mock('../../../utils/auth.js', () => ({ __esModule: true, auth: { api: { getSession: jest.fn() } } }));
jest.mock('../../../models/Usuario.js', () => ({ __esModule: true, default: { findOne: jest.fn() } }));

const ID = '64b7f0c2a1b2c3d4e5f60718';
const SESSAO = { user: { id: ID, email: 'ana@x.com', name: 'Ana' }, session: { id: 's1', token: 't' } };

const usuarioEncontrado = (doc) => {
  const lean = jest.fn().mockResolvedValue(doc);
  const select = jest.fn().mockReturnValue({ lean });
  Usuario.findOne.mockReturnValue({ select });
  return { select };
};

const montar = () => {
  const req = { headers: { cookie: 'sessao=1' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
};

const esperar401 = (res, next, code, message) => {
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ success: false, code, message });
  expect(next).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
  auth.api.getSession.mockResolvedValue(SESSAO);
});

describe('authMiddleware', () => {
  it('responde 401 sem sessão', async () => {
    const { req, res, next } = montar();
    auth.api.getSession.mockResolvedValue(null);

    await authMiddleware(req, res, next);

    expect(fromNodeHeaders).toHaveBeenCalledWith(req.headers);
    expect(auth.api.getSession).toHaveBeenCalledWith({ headers: { convertidos: req.headers } });
    esperar401(res, next, 'UNAUTHORIZED', 'Não autorizado. Faça login para continuar.');
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });

  it('responde 401 de sessão inválida quando a consulta falha', async () => {
    const { req, res, next } = montar();
    auth.api.getSession.mockRejectedValue(new Error('jwt expirado'));

    await authMiddleware(req, res, next);

    esperar401(res, next, 'INVALID_SESSION', 'Token inválido ou sessão expirada.');
  });

  it.each([
    ['CONTA_EXCLUIDA', 'Esta conta foi excluída.', { deletadoEm: new Date(), status_ativo: false }],
    ['CONTA_DESATIVADA', 'Esta conta está desativada. Procure o administrador.', { status_ativo: false }],
    ['CONVITE_PENDENTE', 'Ative sua conta pelo link enviado por e-mail.', { convidadoEm: new Date(), ativadoEm: null }],
  ])('responde 401 %s', async (code, message, doc) => {
    const { req, res, next } = montar();
    usuarioEncontrado({ _id: ID, ...doc });

    await authMiddleware(req, res, next);

    esperar401(res, next, code, message);
  });

  it('busca por e-mail ou id e anexa permissões do documento à requisição', async () => {
    const { req, res, next } = montar();
    const { select } = usuarioEncontrado({
      _id: 'id-do-banco',
      tipos_permissao: ['recrutador'],
      groups: ['g1'],
      permissions: ['p1'],
      status_ativo: true,
      convidadoEm: new Date(),
      ativadoEm: new Date(),
    });

    await authMiddleware(req, res, next);

    expect(Usuario.findOne).toHaveBeenCalledWith({ $or: [{ email: 'ana@x.com' }, { _id: ID }] });
    expect(select).toHaveBeenCalledWith('tipos_permissao groups permissions deletadoEm status_ativo convidadoEm ativadoEm');
    expect(req.user).toEqual({
      ...SESSAO.user,
      _id: 'id-do-banco',
      tipos_permissao: ['recrutador'],
      groups: ['g1'],
      permissions: ['p1'],
    });
    expect(req.user_id).toBe('id-do-banco');
    expect(req.authSession).toBe(SESSAO.session);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sem documento no banco usa o id da sessão e listas vazias', async () => {
    const { req, res, next } = montar();
    auth.api.getSession.mockResolvedValue({ ...SESSAO, user: { ...SESSAO.user, id: 'id-externo' } });
    usuarioEncontrado(null);

    await authMiddleware(req, res, next);

    expect(Usuario.findOne).toHaveBeenCalledWith({ $or: [{ email: 'ana@x.com' }] });
    expect(req.user).toMatchObject({ _id: 'id-externo', tipos_permissao: [], groups: [], permissions: [] });
    expect(req.user_id).toBe('id-externo');
    expect(next).toHaveBeenCalledWith();
  });
});

import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import Usuario from '../../models/Usuario.js';

let authMiddleware;
let auth;

function respostaFake() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

async function rodar(email) {
  jest.spyOn(auth.api, 'getSession').mockResolvedValue({
    user: { id: 'x', email, name: 'T' },
    session: { id: 's' },
  });
  const req = { headers: {} };
  const res = respostaFake();
  const next = jest.fn();
  await authMiddleware(req, res, next);
  return { res, next };
}

describe('authMiddleware e a situacao da conta', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    ({ auth } = await import('../../utils/auth.js'));
    ({ authMiddleware } = await import('../../middlewares/authMiddleware.js'));
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });
  afterAll(disconnectTestDatabase);

  it('conta desativada recebe 401 CONTA_DESATIVADA', async () => {
    await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'], status_ativo: false });
    const { res, next } = await rodar('r@t.com');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe('CONTA_DESATIVADA');
  });

  it('convite pendente recebe 401 CONVITE_PENDENTE', async () => {
    await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'], convidadoEm: new Date() });
    const { res } = await rodar('r@t.com');
    expect(res.json.mock.calls[0][0].code).toBe('CONVITE_PENDENTE');
  });

  it('convite aceito passa', async () => {
    const agora = new Date();
    await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'], convidadoEm: agora, ativadoEm: agora });
    const { next } = await rodar('r@t.com');
    expect(next).toHaveBeenCalled();
  });

  it('conta antiga, sem campos de convite, passa', async () => {
    await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'] });
    const { next } = await rodar('r@t.com');
    expect(next).toHaveBeenCalled();
  });
});

import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import Usuario from '../../models/Usuario.js';
import UsuarioService from '../../service/UsuarioService.js';

const service = new UsuarioService();
const ADMIN = ['administrador'];

async function semear() {
  const agora = new Date();
  await Usuario.create([
    { nome: 'Rec Ativo', email: 'r1@t.com', tipos_permissao: ['recrutador'], convidadoEm: agora, ativadoEm: agora },
    { nome: 'Rec Pendente', email: 'r2@t.com', tipos_permissao: ['recrutador'], convidadoEm: agora },
    { nome: 'Sup Desativado', email: 's1@t.com', tipos_permissao: ['suporte'], status_ativo: false },
    { nome: 'Sup Antigo', email: 's2@t.com', tipos_permissao: ['suporte'] },
    { nome: 'Cand', email: 'c1@t.com', tipos_permissao: ['candidato'] },
  ]);
}

const nomes = (resultado) => resultado.docs.map((u) => u.nome).sort();

describe('UsuarioService.listar (administrador)', () => {
  beforeAll(connectTestDatabase);
  beforeEach(semear);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('filtra por varios papeis', async () => {
    const r = await service.listar({ page: 1, limit: 10, papel: ['recrutador', 'suporte'] }, ADMIN);
    expect(nomes(r)).toEqual(['Rec Ativo', 'Rec Pendente', 'Sup Antigo', 'Sup Desativado']);
  });

  it('filtra pendentes', async () => {
    const r = await service.listar({ page: 1, limit: 10, papel: ['recrutador', 'suporte'], situacao: 'pendente' }, ADMIN);
    expect(nomes(r)).toEqual(['Rec Pendente']);
  });

  it('filtra ativos, inclusive conta sem convite', async () => {
    const r = await service.listar({ page: 1, limit: 10, papel: ['recrutador', 'suporte'], situacao: 'ativo' }, ADMIN);
    expect(nomes(r)).toEqual(['Rec Ativo', 'Sup Antigo']);
  });

  it('filtra desativados', async () => {
    const r = await service.listar({ page: 1, limit: 10, papel: ['recrutador', 'suporte'], situacao: 'desativado' }, ADMIN);
    expect(nomes(r)).toEqual(['Sup Desativado']);
  });

  it('cada item traz a situacao derivada', async () => {
    const r = await service.listar({ page: 1, limit: 10, papel: ['recrutador'] }, ADMIN);
    const porNome = Object.fromEntries(r.docs.map((u) => [u.nome, u.situacao]));
    expect(porNome).toEqual({ 'Rec Ativo': 'ativo', 'Rec Pendente': 'pendente' });
  });

  it('recrutador continua vendo so candidatos, mesmo pedindo outro papel', async () => {
    const r = await service.listar({ page: 1, limit: 10, papel: ['suporte'] }, ['recrutador']);
    expect(nomes(r)).toEqual(['Cand']);
  });
});

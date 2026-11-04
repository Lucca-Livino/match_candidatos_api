import mongoose from 'mongoose';
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import Usuario from '../../models/Usuario.js';
import UsuarioService from '../../service/UsuarioService.js';

const service = new UsuarioService();
const sessoes = () => mongoose.connection.db.collection('session');
const credenciais = () => mongoose.connection.db.collection('account');
const verificacoes = () => mongoose.connection.db.collection('verification');

const erroDe = async (promessa) => {
  try {
    await promessa;
  } catch (erro) {
    return { code: erro.code, status: erro.statusCode };
  }
  return null;
};

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

describe('UsuarioService.alterarStatus', () => {

  it('desativa, derruba as sessoes e mantem a credencial', async () => {
    const admin = await Usuario.create({ nome: 'Adm', email: 'a@t.com', tipos_permissao: ['administrador'] });
    const rec = await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'] });
    await sessoes().insertOne({ userId: rec._id, token: 't' });
    await credenciais().insertOne({ userId: rec._id, providerId: 'credential' });

    const r = await service.alterarStatus(String(rec._id), { status_ativo: false }, String(admin._id));

    expect(r.situacao).toBe('desativado');
    expect(await sessoes().countDocuments()).toBe(0);
    expect(await credenciais().countDocuments()).toBe(1);
  });

  it('reativa', async () => {
    const admin = await Usuario.create({ nome: 'Adm', email: 'a@t.com', tipos_permissao: ['administrador'] });
    const rec = await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'], status_ativo: false });

    const r = await service.alterarStatus(String(rec._id), { status_ativo: true }, String(admin._id));

    expect(r.situacao).toBe('ativo');
  });

  it('recusa desativar a propria conta', async () => {
    const admin = await Usuario.create({ nome: 'Adm', email: 'a@t.com', tipos_permissao: ['administrador'] });
    await Usuario.create({ nome: 'Adm2', email: 'a2@t.com', tipos_permissao: ['administrador'] });

    expect(await erroDe(service.alterarStatus(String(admin._id), { status_ativo: false }, String(admin._id))))
      .toEqual({ code: 'AUTODESATIVACAO', status: 409 });
  });

  it('recusa desativar o ultimo administrador ativo', async () => {
    const unico = await Usuario.create({ nome: 'Adm', email: 'a@t.com', tipos_permissao: ['administrador'] });
    const outroId = new mongoose.Types.ObjectId().toString();

    expect(await erroDe(service.alterarStatus(String(unico._id), { status_ativo: false }, outroId)))
      .toEqual({ code: 'ULTIMO_ADMINISTRADOR', status: 409 });
  });

  it('404 para usuario inexistente', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(await erroDe(service.alterarStatus(id, { status_ativo: false }, 'x')))
      .toEqual({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('UsuarioService.deletar', () => {
  it('remove o documento junto com credencial e sessoes', async () => {
    const rec = await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'] });
    await sessoes().insertOne({ userId: rec._id, token: 't' });
    await credenciais().insertOne({ userId: rec._id, providerId: 'credential' });

    await service.deletar(String(rec._id), new mongoose.Types.ObjectId().toString());

    expect(await Usuario.countDocuments()).toBe(0);
    expect(await sessoes().countDocuments()).toBe(0);
    expect(await credenciais().countDocuments()).toBe(0);
  });

  it('recusa excluir a propria conta', async () => {
    const admin = await Usuario.create({ nome: 'Adm', email: 'a@t.com', tipos_permissao: ['administrador'] });
    await Usuario.create({ nome: 'Adm2', email: 'a2@t.com', tipos_permissao: ['administrador'] });

    expect(await erroDe(service.deletar(String(admin._id), String(admin._id))))
      .toEqual({ code: 'AUTOEXCLUSAO', status: 409 });
    expect(await Usuario.countDocuments()).toBe(2);
  });

  it('recusa excluir o ultimo administrador ativo', async () => {
    const unico = await Usuario.create({ nome: 'Adm', email: 'a@t.com', tipos_permissao: ['administrador'] });
    const outroId = new mongoose.Types.ObjectId().toString();

    expect(await erroDe(service.deletar(String(unico._id), outroId)))
      .toEqual({ code: 'ULTIMO_ADMINISTRADOR', status: 409 });
    expect(await Usuario.countDocuments()).toBe(1);
  });

  it('404 para conta ja excluida pelo proprio usuario', async () => {
    const rec = await Usuario.create({
      nome: 'Conta excluída',
      email: 'x@t.com',
      tipos_permissao: ['recrutador'],
      deletadoEm: new Date(),
    });

    expect(await erroDe(service.deletar(String(rec._id), new mongoose.Types.ObjectId().toString())))
      .toEqual({ code: 'NOT_FOUND', status: 404 });
  });

  it('apaga os tokens de convite pendentes do usuario', async () => {
    const rec = await Usuario.create({ nome: 'Rec', email: 'r@t.com', tipos_permissao: ['recrutador'] });
    const outro = new mongoose.Types.ObjectId().toString();
    await verificacoes().insertMany([
      { value: String(rec._id), identifier: 'reset-password:abc', expiresAt: new Date() },
      { value: String(rec._id), identifier: 'outra-coisa:abc', expiresAt: new Date() },
      { value: outro, identifier: 'reset-password:def', expiresAt: new Date() },
    ]);

    await service.deletar(String(rec._id), new mongoose.Types.ObjectId().toString());

    const restantes = await verificacoes().find().toArray();
    expect(restantes.map((v) => v.identifier).sort()).toEqual(['outra-coisa:abc', 'reset-password:def']);
  });
});

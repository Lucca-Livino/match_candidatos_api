import mongoose from 'mongoose';
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import Usuario from '../../models/Usuario.js';
import ConviteService from '../../service/ConviteService.js';
import UsuarioRepository from '../../repository/UsuarioRepository.js';

let auth;

const novoEmailFake = () => ({ enviarConvite: jest.fn().mockResolvedValue({ enviado: true }) });
const tokenEnviado = (emailService, chamada = 0) => emailService.enviarConvite.mock.calls[chamada][0].token;
const contar = (colecao) => mongoose.connection.db.collection(colecao).countDocuments();

const erroDe = async (promessa) => {
  try {
    await promessa;
  } catch (erro) {
    return { code: erro.code, status: erro.statusCode };
  }
  return null;
};

describe('ConviteService', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    ({ auth } = await import('../../utils/auth.js'));
  });
  afterEach(async () => {
    await clearTestDatabase();
    await Promise.all(
      ['account', 'session', 'verification'].map((colecao) =>
        mongoose.connection.db.collection(colecao).deleteMany({}),
      ),
    );
  });
  afterAll(disconnectTestDatabase);

  const convite = { nome: 'Ana Recrutadora', email: 'ana@t.com', papel: 'recrutador' };

  it('convidar cria conta pendente com o papel e envia o token', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });

    const resultado = await service.convidar(convite);

    expect(resultado.situacao).toBe('pendente');
    const usuario = await Usuario.findOne({ email: 'ana@t.com' }).lean();
    expect(usuario.tipos_permissao).toEqual(['recrutador']);
    expect(usuario.convidadoEm).toBeInstanceOf(Date);
    expect(usuario.ativadoEm).toBeNull();

    const enviado = emailService.enviarConvite.mock.calls[0][0];
    expect(enviado).toMatchObject({ nome: 'Ana Recrutadora', email: 'ana@t.com', papel: 'recrutador' });
    expect(typeof enviado.token).toBe('string');
    expect(enviado.token.length).toBeGreaterThan(30);
    expect(await contar('session')).toBe(0);
  });

  it('convidar recusa email ja cadastrado', async () => {
    await Usuario.create({ nome: 'Outro', email: 'ana@t.com', tipos_permissao: ['candidato'] });
    const service = new ConviteService({ emailService: novoEmailFake() });

    expect(await erroDe(service.convidar(convite))).toEqual({ code: 'CONFLICT', status: 409 });
  });

  it('falha no envio desfaz a conta, a credencial e o token', async () => {
    const emailService = { enviarConvite: jest.fn().mockRejectedValue(new Error('smtp fora')) };
    const service = new ConviteService({ emailService });

    expect(await erroDe(service.convidar(convite))).toEqual({ code: 'EMAIL_FALHOU', status: 502 });
    expect(await Usuario.countDocuments({ email: 'ana@t.com' })).toBe(0);
    expect(await contar('account')).toBe(0);
    expect(await contar('verification')).toBe(0);
    expect(await contar('session')).toBe(0);
  });

  it('falha antes do envio desfaz a conta e propaga o erro original', async () => {
    const emailService = novoEmailFake();
    const repository = new UsuarioRepository();
    jest.spyOn(repository, 'atualizarPorEmail').mockRejectedValueOnce(new Error('banco fora'));
    const service = new ConviteService({ repository, emailService });

    await expect(service.convidar(convite)).rejects.toThrow('banco fora');
    expect(await Usuario.countDocuments({ email: 'ana@t.com' })).toBe(0);
    expect(await contar('account')).toBe(0);
    expect(emailService.enviarConvite).not.toHaveBeenCalled();
  });

  it('ativar define a senha, marca ativadoEm e permite login', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });
    await service.convidar(convite);

    const resultado = await service.ativar({ token: tokenEnviado(emailService), senha: 'Nova@Senha1' });

    expect(resultado.situacao).toBe('ativo');
    const usuario = await Usuario.findOne({ email: 'ana@t.com' }).lean();
    expect(usuario.ativadoEm).toBeInstanceOf(Date);

    const login = await auth.api.signInEmail({ body: { email: 'ana@t.com', password: 'Nova@Senha1' } });
    expect(login.token).toBeTruthy();
  });

  it('ativar recusa token desconhecido', async () => {
    const service = new ConviteService({ emailService: novoEmailFake() });
    expect(await erroDe(service.ativar({ token: 'nao-existe', senha: 'Nova@Senha1' })))
      .toEqual({ code: 'TOKEN_INVALIDO', status: 400 });
  });

  it('o mesmo link nao ativa duas vezes', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });
    await service.convidar(convite);
    const token = tokenEnviado(emailService);
    await service.ativar({ token, senha: 'Nova@Senha1' });

    expect(await erroDe(service.ativar({ token, senha: 'Outra@Senha2' })))
      .toEqual({ code: 'TOKEN_INVALIDO', status: 400 });
  });

  it('ativar recusa conta ja ativada mesmo com token valido', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });
    await service.convidar(convite);
    await service.ativar({ token: tokenEnviado(emailService), senha: 'Nova@Senha1' });
    const usuario = await Usuario.findOne({ email: 'ana@t.com' }).lean();
    const tokenNovo = await service.gerarToken(usuario._id);

    expect(await erroDe(service.ativar({ token: tokenNovo, senha: 'Outra@Senha2' })))
      .toEqual({ code: 'CONTA_JA_ATIVADA', status: 400 });
  });

  it('reenviar troca o token e invalida o anterior', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });
    const { _id } = await service.convidar(convite);
    const tokenAntigo = tokenEnviado(emailService, 0);

    await service.reenviar(String(_id));
    const tokenNovo = tokenEnviado(emailService, 1);

    expect(tokenNovo).not.toBe(tokenAntigo);
    expect(await erroDe(service.ativar({ token: tokenAntigo, senha: 'Nova@Senha1' })))
      .toEqual({ code: 'TOKEN_INVALIDO', status: 400 });
    await expect(service.ativar({ token: tokenNovo, senha: 'Nova@Senha1' })).resolves.toMatchObject({ situacao: 'ativo' });
  });

  it('reenviar recusa conta ja ativada', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });
    const { _id } = await service.convidar(convite);
    await service.ativar({ token: tokenEnviado(emailService), senha: 'Nova@Senha1' });

    expect(await erroDe(service.reenviar(String(_id)))).toEqual({ code: 'CONTA_JA_ATIVADA', status: 400 });
  });

  it('reenviar com falha no e-mail responde 502, mantem a conta e nao deixa token valido', async () => {
    const emailService = novoEmailFake();
    const service = new ConviteService({ emailService });
    const { _id } = await service.convidar(convite);
    emailService.enviarConvite.mockRejectedValueOnce(new Error('smtp fora'));

    expect(await erroDe(service.reenviar(String(_id)))).toEqual({ code: 'EMAIL_FALHOU', status: 502 });
    expect(await Usuario.countDocuments({ email: 'ana@t.com' })).toBe(1);
    expect(await contar('verification')).toBe(0);
  });
});

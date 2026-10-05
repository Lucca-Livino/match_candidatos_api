import crypto from 'node:crypto';
import mongoose from 'mongoose';
import UsuarioRepository from '../repository/UsuarioRepository.js';
import ExclusaoContaRepository from '../repository/ExclusaoContaRepository.js';
import emailServicePadrao from './EmailService.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';
import { situacaoDoUsuario } from '../utils/helpers/situacaoUsuario.js';

const VALIDADE_CONVITE_MS = 24 * 60 * 60 * 1000;

// Mesmo formato que o `resetPassword` do better-auth procura na colecao
// `verification`: gerar aqui e consumir la mantem a senha sob o hash dele.
const identificador = (token) => `reset-password:${token}`;

// utils/auth.js le mongoose.connection.db na importacao, por isso o import e
// tardio: quando este servico e instanciado, o banco ainda pode nao estar de pe.
const carregarAuth = async () => (await import('../utils/auth.js')).auth;

const tokenInvalido = () =>
  new AppError(
    'Link de ativacao invalido ou expirado. Peca um novo convite ao administrador.',
    400,
    'TOKEN_INVALIDO',
  );

const falhaNoEnvio = () =>
  new AppError('Nao foi possivel enviar o convite. Tente novamente.', 502, 'EMAIL_FALHOU');

class ConviteService {
  constructor({
    repository = new UsuarioRepository(),
    exclusaoRepository = new ExclusaoContaRepository(),
    emailService = emailServicePadrao,
    obterAuth = carregarAuth,
  } = {}) {
    this.repository = repository;
    this.exclusaoRepository = exclusaoRepository;
    this.emailService = emailService;
    this.obterAuth = obterAuth;
  }

  apresentar(usuario) {
    return { ...sanitizeDoc(usuario, ['senha']), situacao: situacaoDoUsuario(usuario) };
  }

  async gerarToken(usuarioId) {
    const auth = await this.obterAuth();
    const contexto = await auth.$context;
    const token = crypto.randomBytes(32).toString('base64url');

    await contexto.internalAdapter.createVerificationValue({
      value: String(usuarioId),
      identifier: identificador(token),
      expiresAt: new Date(Date.now() + VALIDADE_CONVITE_MS),
    });

    return token;
  }

  async apagarTokens(usuarioId) {
    await mongoose.connection.db
      .collection('verification')
      .deleteMany({ value: String(usuarioId), identifier: /^reset-password:/ });
  }

  async convidar({ nome, email, papel }) {
    const existente = await this.repository.buscarPorEmail(email);
    if (existente) {
      throw new AppError('Ja existe usuario com este email.', 409, 'CONFLICT');
    }

    const auth = await this.obterAuth();
    // Senha aleatoria que ninguem recebe: a conta so ganha dono quando o
    // convidado define a propria senha pelo link do e-mail.
    await auth.api.signUpEmail({
      body: { email, name: nome, password: crypto.randomBytes(24).toString('base64url') },
    });

    const Grupo = (await import('../models/Grupo.js')).default;
    const grupos = await Grupo.find({ nome: papel }).select('_id').lean();

    // O signUpEmail grava em 'usuarios' por fora do schema; papel, grupos,
    // contato vazio e os campos do convite entram aqui.
    const usuario = await this.repository.atualizarPorEmail(email, {
      tipos_permissao: [papel],
      status_ativo: true,
      groups: grupos.map((grupo) => grupo._id),
      telefone: '',
      linkedin: '',
      cidade: '',
      convidadoEm: new Date(),
      ativadoEm: null,
    });

    try {
      const token = await this.gerarToken(usuario._id);
      await this.emailService.enviarConvite({ nome, email, papel, token });
    } catch (erro) {
      // Conta sem convite entregue e conta que ninguem consegue usar: desfaz
      // para o administrador poder tentar de novo com o mesmo e-mail.
      await this.desfazerCriacao(usuario._id);
      throw falhaNoEnvio();
    }

    return this.apresentar(usuario);
  }

  async desfazerCriacao(usuarioId) {
    await this.apagarTokens(usuarioId);
    await this.exclusaoRepository.revogarAcesso(usuarioId);
    await this.repository.deletar(usuarioId);
  }

  async reenviar(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de usuario invalido.', 400, 'VALIDATION_ERROR');
    }

    const usuario = await this.repository.buscarPorId(id);
    if (!usuario || usuario.deletadoEm) {
      throw new AppError('Usuario nao encontrado.', 404, 'NOT_FOUND');
    }

    if (!usuario.convidadoEm || usuario.ativadoEm) {
      throw new AppError('Esta conta ja foi ativada.', 400, 'CONTA_JA_ATIVADA');
    }

    // Um link por vez: o reenvio invalida o anterior, que pode ter ido para a
    // caixa errada.
    await this.apagarTokens(id);

    try {
      const token = await this.gerarToken(id);
      await this.emailService.enviarConvite({
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.tipos_permissao?.[0],
        token,
      });
    } catch (erro) {
      throw falhaNoEnvio();
    }

    const atualizado = await this.repository.atualizar(id, { convidadoEm: new Date() });
    return this.apresentar(atualizado);
  }

  async ativar({ token, senha }) {
    const auth = await this.obterAuth();
    const contexto = await auth.$context;
    const verificacao = await contexto.internalAdapter.findVerificationValue(identificador(token));

    if (!verificacao || new Date(verificacao.expiresAt) < new Date()) {
      throw tokenInvalido();
    }

    const usuario = await this.repository.buscarPorId(verificacao.value);
    if (!usuario || usuario.deletadoEm) {
      throw tokenInvalido();
    }

    if (!usuario.convidadoEm || usuario.ativadoEm) {
      throw new AppError('Esta conta ja foi ativada. Faca login.', 400, 'CONTA_JA_ATIVADA');
    }

    await auth.api.resetPassword({ body: { token, newPassword: senha } });

    const atualizado = await this.repository.atualizar(usuario._id, { ativadoEm: new Date() });
    return this.apresentar(atualizado);
  }
}

export default ConviteService;

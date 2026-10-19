import mongoose from 'mongoose';
import UsuarioRepository from '../repository/UsuarioRepository.js';
import ExclusaoContaRepository from '../repository/ExclusaoContaRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { hashPassword } from '../utils/password.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';
import { situacaoDoUsuario } from '../utils/helpers/situacaoUsuario.js';

class UsuarioService {
  constructor(repository = new UsuarioRepository(), exclusaoRepository = new ExclusaoContaRepository()) {
    this.repository = repository;
    this.exclusaoRepository = exclusaoRepository;
  }

  sanitize(usuario) {
    return sanitizeDoc(usuario, ['senha']);
  }

  ensureObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de usuário inválido.', 400, 'VALIDATION_ERROR');
    }
  }

  async withHashedPassword(payload) {
    if (!Object.hasOwn(payload, 'senha')) {
      return payload;
    }

    return {
      ...payload,
      senha: await hashPassword(payload.senha),
    };
  }

  // `papeisDoSolicitante` decide o alcance da listagem. O recrutador chega aqui
  // pela tela de candidatos: sem o recorte ele receberia tambem admins,
  // suportes e outros recrutadores — dados pessoais que a tela nao pede e que
  // a resposta carregaria de qualquer jeito, visiveis no devtools.
  async listar(query, papeisDoSolicitante = []) {
    const eAdmin = papeisDoSolicitante.includes('administrador');
    const result = await this.repository.listarPaginado(
      eAdmin ? query : { ...query, papel: 'candidato' },
    );

    return {
      ...result,
      docs: result.docs.map((item) => ({ ...this.sanitize(item), situacao: situacaoDoUsuario(item) })),
    };
  }

  async buscarPorId(id) {
    this.ensureObjectId(id);

    const usuario = await this.repository.buscarPorId(id);
    if (!usuario) {
      throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
    }

    return this.sanitize(usuario);
  }

  // Provisiona usuario de forma consistente com o Better Auth:
  // 1) cria a conta (email/senha) via signUpEmail (hash fica na collection 'account');
  // 2) vincula papel e grupos no mesmo doc 'usuarios'.
  // Usado tanto pelo auto-cadastro de candidato quanto pela criacao administrativa.
  async provisionarComAuth({
    nome,
    email,
    senha,
    tipos_permissao,
    status_ativo = true,
    telefone,
    linkedin,
    cidade,
  }) {
    const jaExiste = await this.repository.buscarPorEmail(email);
    if (jaExiste) {
      throw new AppError('Já existe usuário com este e-mail.', 409, 'CONFLICT');
    }

    const { auth } = await import('../utils/auth.js');
    await auth.api.signUpEmail({ body: { email, password: senha, name: nome } });

    const Grupo = (await import('../models/Grupo.js')).default;
    const grupos = await Grupo.find({ nome: { $in: tipos_permissao } }).select('_id').lean();

    const atualizado = await this.repository.atualizarPorEmail(email, {
      tipos_permissao,
      status_ativo,
      groups: grupos.map((grupo) => grupo._id),
      // O signUpEmail grava em 'usuarios' por fora do schema, entao os defaults
      // do model nao chegam a este documento. Sem gravar aqui, o contato
      // enviado na criacao administrativa seria silenciosamente descartado, e
      // o campo ficaria ausente em vez de vazio na leitura.
      telefone: telefone ?? '',
      linkedin: linkedin ?? '',
      cidade: cidade ?? '',
    });

    return this.sanitize(atualizado);
  }

  async registrarCandidato({ nome, email, senha }) {
    if (!nome || !email || !senha) {
      throw new AppError('nome, e-mail e senha são obrigatórios.', 400, 'VALIDATION_ERROR');
    }

    return this.provisionarComAuth({
      nome,
      email,
      senha,
      tipos_permissao: ['candidato'],
      status_ativo: true,
    });
  }

  async criar(payload) {
    return this.provisionarComAuth(payload);
  }

  async atualizar(id, payload) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
    }

    if (payload.email && payload.email !== existente.email) {
      const usuarioEmail = await this.repository.buscarPorEmail(payload.email);
      if (usuarioEmail && String(usuarioEmail._id) !== String(id)) {
        throw new AppError('Já existe usuário com este e-mail.', 409, 'CONFLICT');
      }
    }

    const payloadComHash = await this.withHashedPassword(payload);
    const atualizado = await this.repository.atualizar(id, payloadComHash);
    return this.sanitize(atualizado);
  }

  // Endereco de substituicao da conta excluida. O TLD `.invalido` e reservado
  // para uso ficticio, entao nenhum email real colide com ele, e o sufixo com
  // o proprio id garante unicidade sem depender de sorteio.
  emailAnonimo(id) {
    return `excluido+${String(id)}@conta-removida.invalido`;
  }

  // Autoexclusao (DELETE /usuarios/me). Diferente de `deletar`, que e o ato
  // administrativo e remove o documento, aqui a conta e anonimizada: o _id
  // precisa sobreviver porque as candidaturas apontam para ele.
  async excluirPropriaConta(usuarioId, { emailConfirmacao } = {}) {
    this.ensureObjectId(usuarioId);

    const usuario = await this.repository.buscarPorId(usuarioId);
    if (!usuario || usuario.deletadoEm) {
      throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
    }

    const informado = typeof emailConfirmacao === 'string' ? emailConfirmacao.trim().toLowerCase() : '';
    if (!informado) {
      throw new AppError(
        'Informe o e-mail da conta para confirmar a exclusão.',
        400,
        'VALIDATION_ERROR',
      );
    }

    if (informado !== String(usuario.email).trim().toLowerCase()) {
      throw new AppError(
        'O e-mail informado não confere com o da conta.',
        400,
        'CONFIRMACAO_INVALIDA',
      );
    }

    // Sem esta guarda o ultimo administrador se excluiria e deixaria o sistema
    // sem ninguem capaz de criar contas internas ou reativar a permissao.
    if (usuario.tipos_permissao?.includes('administrador')) {
      const administradores = await this.repository.contarAdministradoresAtivos();
      if (administradores <= 1) {
        throw new AppError(
          'Você é o único administrador ativo. Promova outro administrador antes de excluir sua conta.',
          409,
          'ULTIMO_ADMINISTRADOR',
        );
      }
    }

    // A anonimizacao vem primeiro: e ela que torna a conta inalcancavel. Se um
    // dos passos seguintes falhar, o authMiddleware ja barra o acesso pelo
    // `deletadoEm` e o que sobrar e residuo removivel, nao conta viva.
    await this.repository.anonimizar(usuarioId, {
      nome: 'Conta excluída',
      email: this.emailAnonimo(usuarioId),
      deletadoEm: new Date(),
    });

    await this.exclusaoRepository.revogarAcesso(usuarioId);
    await this.exclusaoRepository.removerCurriculo(usuarioId);

    return {
      id: String(usuarioId),
      deletado: true,
    };
  }

  // Desativar barra o login (authMiddleware) sem apagar nada: candidaturas,
  // vagas e historico continuam apontando para a conta.
  async alterarStatus(id, { status_ativo }, solicitanteId) {
    this.ensureObjectId(id);

    const usuario = await this.repository.buscarPorId(id);
    if (!usuario || usuario.deletadoEm) {
      throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
    }

    if (!status_ativo) {
      if (String(id) === String(solicitanteId)) {
        throw new AppError('Você não pode desativar a própria conta.', 409, 'AUTODESATIVACAO');
      }

      if (usuario.tipos_permissao?.includes('administrador')) {
        const administradores = await this.repository.contarAdministradoresAtivos();
        if (administradores <= 1) {
          throw new AppError(
            'Este é o único administrador ativo. Ative outro administrador antes de desativá-lo.',
            409,
            'ULTIMO_ADMINISTRADOR',
          );
        }
      }
    }

    const atualizado = await this.repository.atualizar(id, { status_ativo });

    if (!status_ativo) {
      await this.exclusaoRepository.revogarSessoes(id);
    }

    return { ...this.sanitize(atualizado), situacao: situacaoDoUsuario(atualizado) };
  }

  async deletar(id, solicitanteId) {
    this.ensureObjectId(id);

    if (String(id) === String(solicitanteId)) {
      throw new AppError(
        'Você não pode excluir a própria conta por aqui. Use a exclusão da própria conta no perfil.',
        409,
        'AUTOEXCLUSAO',
      );
    }

    // Conta ja anonimizada pela autoexclusao conta como inexistente: o
    // documento so sobrevive para manter as referencias das candidaturas.
    const existente = await this.repository.buscarPorId(id);
    if (!existente || existente.deletadoEm) {
      throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
    }

    if (existente.tipos_permissao?.includes('administrador')) {
      const administradores = await this.repository.contarAdministradoresAtivos();
      if (administradores <= 1) {
        throw new AppError(
          'Este é o único administrador ativo. Ative outro administrador antes de excluí-lo.',
          409,
          'ULTIMO_ADMINISTRADOR',
        );
      }
    }

    // Sem isto a credencial e a sessao sobreviviam ao documento, e um convite
    // novo para o mesmo e-mail encontrava residuo da conta anterior. O token de
    // convite pendente tambem sai: apontaria para um id que nao existe mais.
    await this.exclusaoRepository.apagarTokensConvite(id);
    await this.exclusaoRepository.revogarAcesso(id);
    await this.repository.deletar(id);

    return {
      id,
      deletado: true,
    };
  }
}

export default UsuarioService;

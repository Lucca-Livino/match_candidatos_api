import crypto from 'node:crypto';
import ConviteService from './ConviteService.js';
import Grupo from '../models/Grupo.js';
import emailServicePadrao from './EmailService.js';
import { auth as authPadrao } from '../utils/auth.js';
import AppError from '../utils/helpers/AppError.js';

jest.mock('node:crypto', () => ({
  __esModule: true,
  default: { randomBytes: jest.fn((tamanho) => ({ toString: (codificacao) => `aleatorio-${tamanho}-${codificacao}` })) },
}));
jest.mock('../models/Grupo.js', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('./EmailService.js', () => ({ __esModule: true, default: { enviarConvite: jest.fn() } }));
jest.mock('../utils/auth.js', () => ({ __esModule: true, auth: { marcador: 'auth-padrao' } }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn() } }));
jest.mock('../repository/UsuarioRepository.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ repositorioPadrao: 'usuario' })),
}));
jest.mock('../repository/ExclusaoContaRepository.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ repositorioPadrao: 'exclusao' })),
}));

const AGORA = new Date('2026-11-02T12:00:00.000Z');
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const ID = '64b7f0c2a1b2c3d4e5f60718';
const TOKEN = 'aleatorio-32-base64url';
const SENHA_DESCARTAVEL = 'aleatorio-24-base64url';

const convite = { nome: 'Ana Recrutadora', email: 'ana@t.com', papel: 'recrutador' };

const novoRepository = () => ({
  buscarPorEmail: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
  atualizarPorEmail: jest.fn(),
  deletar: jest.fn().mockResolvedValue(undefined),
});

const novoExclusaoRepository = () => ({
  apagarTokensConvite: jest.fn().mockResolvedValue(undefined),
  revogarSessoes: jest.fn().mockResolvedValue(undefined),
  revogarAcesso: jest.fn().mockResolvedValue(undefined),
});

const novoAuth = () => {
  const internalAdapter = {
    createVerificationValue: jest.fn().mockResolvedValue(undefined),
    findVerificationValue: jest.fn(),
  };
  return {
    internalAdapter,
    $context: Promise.resolve({ internalAdapter }),
    api: {
      signUpEmail: jest.fn().mockResolvedValue({}),
      resetPassword: jest.fn().mockResolvedValue({ status: true }),
    },
  };
};

const montar = () => {
  const repository = novoRepository();
  const exclusaoRepository = novoExclusaoRepository();
  const emailService = { enviarConvite: jest.fn().mockResolvedValue({ enviado: true }) };
  const auth = novoAuth();
  const obterAuth = jest.fn().mockResolvedValue(auth);
  const service = new ConviteService({ repository, exclusaoRepository, emailService, obterAuth });
  return { service, repository, exclusaoRepository, emailService, auth, obterAuth };
};

const gruposEncontrados = (grupos) => {
  const lean = jest.fn().mockResolvedValue(grupos);
  const select = jest.fn().mockReturnValue({ lean });
  Grupo.find.mockReturnValue({ select });
  return { select, lean };
};

const capturarErro = async (promessa) => {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error('a promessa deveria ter sido rejeitada');
};

const esperarAppError = (erro, mensagem, statusCode, code) => {
  expect(erro).toBeInstanceOf(AppError);
  expect(erro).toMatchObject({ message: mensagem, statusCode, code });
};

const MENSAGEM_TOKEN_INVALIDO = 'Link de ativação inválido ou expirado. Peça um novo convite ao administrador.';
const MENSAGEM_FALHA_ENVIO = 'Não foi possível enviar o convite. Tente novamente.';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(AGORA.getTime());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ConviteService', () => {
  describe('construtor', () => {
    it('usa repositórios, serviço de e-mail e auth padrão quando nada é injetado', async () => {
      const service = new ConviteService();

      expect(service.repository).toEqual({ repositorioPadrao: 'usuario' });
      expect(service.exclusaoRepository).toEqual({ repositorioPadrao: 'exclusao' });
      expect(service.emailService).toBe(emailServicePadrao);
      await expect(service.obterAuth()).resolves.toBe(authPadrao);
    });
  });

  describe('apresentar', () => {
    it('remove senha e __v e acrescenta a situação derivada', () => {
      const { service } = montar();

      const apresentado = service.apresentar({ _id: ID, nome: 'Ana', senha: 'x', __v: 3, convidadoEm: AGORA, ativadoEm: null });

      expect(apresentado).toEqual({ _id: ID, nome: 'Ana', convidadoEm: AGORA, ativadoEm: null, situacao: 'pendente' });
    });

    it('usa toObject quando recebe documento Mongoose', () => {
      const { service } = montar();
      const documento = { toObject: () => ({ _id: ID, senha: 'x', convidadoEm: AGORA, ativadoEm: AGORA }) };

      expect(service.apresentar(documento)).toEqual({ _id: ID, convidadoEm: AGORA, ativadoEm: AGORA, situacao: 'ativo' });
    });
  });

  describe('gerarToken', () => {
    it('grava a verificação no formato do reset-password com validade de 24 horas', async () => {
      const { service, auth } = montar();

      const token = await service.gerarToken(ID);

      expect(token).toBe(TOKEN);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(auth.internalAdapter.createVerificationValue).toHaveBeenCalledWith({
        value: ID,
        identifier: `reset-password:${TOKEN}`,
        expiresAt: new Date(AGORA.getTime() + UM_DIA_MS),
      });
    });

    it('converte o id para texto antes de gravar', async () => {
      const { service, auth } = montar();
      const objectId = { toString: () => ID };

      await service.gerarToken(objectId);

      expect(auth.internalAdapter.createVerificationValue.mock.calls[0][0].value).toBe(ID);
    });
  });

  describe('convidar', () => {
    const prepararSucesso = (contexto) => {
      contexto.repository.buscarPorEmail.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: ID });
      contexto.repository.atualizarPorEmail.mockResolvedValue({
        _id: ID,
        nome: convite.nome,
        email: convite.email,
        senha: 'hash',
        tipos_permissao: [convite.papel],
        status_ativo: true,
        convidadoEm: AGORA,
        ativadoEm: null,
      });
      return gruposEncontrados([{ _id: 'grupo-1' }, { _id: 'grupo-2' }]);
    };

    it('recusa e-mail já cadastrado com 409 sem criar conta', async () => {
      const { service, repository, auth, emailService } = montar();
      repository.buscarPorEmail.mockResolvedValue({ _id: 'outro' });

      const erro = await capturarErro(service.convidar(convite));

      esperarAppError(erro, 'Já existe usuário com este e-mail.', 409, 'CONFLICT');
      expect(repository.buscarPorEmail).toHaveBeenCalledWith('ana@t.com');
      expect(auth.api.signUpEmail).not.toHaveBeenCalled();
      expect(emailService.enviarConvite).not.toHaveBeenCalled();
    });

    it('cria a conta no better-auth com senha aleatória que ninguém recebe', async () => {
      const contexto = montar();
      prepararSucesso(contexto);

      await contexto.service.convidar(convite);

      expect(crypto.randomBytes).toHaveBeenCalledWith(24);
      expect(contexto.auth.api.signUpEmail).toHaveBeenCalledWith({
        body: { email: 'ana@t.com', name: 'Ana Recrutadora', password: SENHA_DESCARTAVEL },
      });
    });

    it('revoga a sessão aberta pelo autoSignIn do cadastro', async () => {
      const contexto = montar();
      prepararSucesso(contexto);

      await contexto.service.convidar(convite);

      expect(contexto.exclusaoRepository.revogarSessoes).toHaveBeenCalledWith(ID);
    });

    it('grava o papel, os grupos do papel e os campos do convite', async () => {
      const contexto = montar();
      const { select } = prepararSucesso(contexto);

      await contexto.service.convidar(convite);

      expect(Grupo.find).toHaveBeenCalledWith({ nome: 'recrutador' });
      expect(select).toHaveBeenCalledWith('_id');
      expect(contexto.repository.atualizarPorEmail).toHaveBeenCalledWith('ana@t.com', {
        tipos_permissao: ['recrutador'],
        status_ativo: true,
        groups: ['grupo-1', 'grupo-2'],
        telefone: '',
        linkedin: '',
        cidade: '',
        convidadoEm: AGORA,
        ativadoEm: null,
      });
    });

    it('usa o papel informado tanto nas permissões quanto na busca de grupos', async () => {
      const contexto = montar();
      prepararSucesso(contexto);

      await contexto.service.convidar({ ...convite, papel: 'administrador' });

      expect(Grupo.find).toHaveBeenCalledWith({ nome: 'administrador' });
      expect(contexto.repository.atualizarPorEmail.mock.calls[0][1].tipos_permissao).toEqual(['administrador']);
    });

    it('envia o convite com nome, e-mail, papel e o token gerado', async () => {
      const contexto = montar();
      prepararSucesso(contexto);

      await contexto.service.convidar(convite);

      expect(contexto.auth.internalAdapter.createVerificationValue).toHaveBeenCalledWith(
        expect.objectContaining({ value: ID, identifier: `reset-password:${TOKEN}` }),
      );
      expect(contexto.emailService.enviarConvite).toHaveBeenCalledWith({
        nome: 'Ana Recrutadora',
        email: 'ana@t.com',
        papel: 'recrutador',
        token: TOKEN,
      });
    });

    it('devolve o usuário pendente sem a senha', async () => {
      const contexto = montar();
      prepararSucesso(contexto);

      const resultado = await contexto.service.convidar(convite);

      expect(resultado).not.toHaveProperty('senha');
      expect(resultado).toMatchObject({ _id: ID, email: 'ana@t.com', situacao: 'pendente' });
    });

    it('falha no envio do e-mail desfaz a conta e responde 502', async () => {
      const contexto = montar();
      prepararSucesso(contexto);
      contexto.emailService.enviarConvite.mockRejectedValue(new Error('smtp fora'));

      const erro = await capturarErro(contexto.service.convidar(convite));

      esperarAppError(erro, MENSAGEM_FALHA_ENVIO, 502, 'EMAIL_FALHOU');
      expect(contexto.exclusaoRepository.apagarTokensConvite).toHaveBeenCalledWith(ID);
      expect(contexto.exclusaoRepository.revogarAcesso).toHaveBeenCalledWith(ID);
      expect(contexto.repository.deletar).toHaveBeenCalledWith(ID);
    });

    it('falha antes do envio desfaz a conta e propaga o erro original', async () => {
      const contexto = montar();
      prepararSucesso(contexto);
      const erroOriginal = new Error('banco fora');
      contexto.repository.atualizarPorEmail.mockRejectedValue(erroOriginal);

      const erro = await capturarErro(contexto.service.convidar(convite));

      expect(erro).toBe(erroOriginal);
      expect(contexto.repository.deletar).toHaveBeenCalledWith(ID);
      expect(contexto.emailService.enviarConvite).not.toHaveBeenCalled();
    });

    it('falha ao gerar o token não é tratada como falha de envio', async () => {
      const contexto = montar();
      prepararSucesso(contexto);
      const erroOriginal = new Error('verification fora');
      contexto.auth.internalAdapter.createVerificationValue.mockRejectedValue(erroOriginal);

      const erro = await capturarErro(contexto.service.convidar(convite));

      expect(erro).toBe(erroOriginal);
      expect(contexto.repository.deletar).toHaveBeenCalledWith(ID);
    });

    it('mantém o erro de envio mesmo quando o rollback também falha', async () => {
      const contexto = montar();
      prepararSucesso(contexto);
      contexto.emailService.enviarConvite.mockRejectedValue(new Error('smtp fora'));
      contexto.exclusaoRepository.revogarAcesso.mockRejectedValue(new Error('rollback fora'));

      const erro = await capturarErro(contexto.service.convidar(convite));

      esperarAppError(erro, MENSAGEM_FALHA_ENVIO, 502, 'EMAIL_FALHOU');
      expect(contexto.repository.deletar).not.toHaveBeenCalled();
    });

    it('não tenta desfazer quando a conta recém-criada não é encontrada', async () => {
      const contexto = montar();
      prepararSucesso(contexto);
      contexto.repository.buscarPorEmail.mockReset().mockResolvedValue(null);
      contexto.repository.atualizarPorEmail.mockRejectedValue(new Error('sem usuário'));

      await expect(contexto.service.convidar(convite)).rejects.toThrow('sem usuário');
      expect(contexto.repository.deletar).not.toHaveBeenCalled();
      expect(contexto.exclusaoRepository.revogarAcesso).not.toHaveBeenCalled();
    });

    it('propaga a falha do cadastro no better-auth sem tentar desfazer', async () => {
      const contexto = montar();
      contexto.repository.buscarPorEmail.mockResolvedValue(null);
      contexto.auth.api.signUpEmail.mockRejectedValue(new Error('cadastro recusado'));

      await expect(contexto.service.convidar(convite)).rejects.toThrow('cadastro recusado');
      expect(contexto.repository.deletar).not.toHaveBeenCalled();
      expect(contexto.emailService.enviarConvite).not.toHaveBeenCalled();
    });
  });

  describe('reenviar', () => {
    const pendente = {
      _id: ID,
      nome: 'Ana Recrutadora',
      email: 'ana@t.com',
      tipos_permissao: ['recrutador', 'candidato'],
      status_ativo: true,
      convidadoEm: new Date('2026-10-30T12:00:00.000Z'),
      ativadoEm: null,
    };

    it('recusa id que não é ObjectId com 400', async () => {
      const { service, repository } = montar();

      const erro = await capturarErro(service.reenviar('nao-e-id'));

      esperarAppError(erro, 'ID de usuário inválido.', 400, 'VALIDATION_ERROR');
      expect(repository.buscarPorId).not.toHaveBeenCalled();
    });

    it('responde 404 para usuário inexistente', async () => {
      const { service, repository } = montar();
      repository.buscarPorId.mockResolvedValue(null);

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, 'Usuário não encontrado.', 404, 'NOT_FOUND');
    });

    it('responde 404 para conta autoexcluída', async () => {
      const { service, repository } = montar();
      repository.buscarPorId.mockResolvedValue({ ...pendente, deletadoEm: AGORA });

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, 'Usuário não encontrado.', 404, 'NOT_FOUND');
    });

    it('recusa conta já ativada', async () => {
      const { service, repository, exclusaoRepository, emailService } = montar();
      repository.buscarPorId.mockResolvedValue({ ...pendente, ativadoEm: AGORA });

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, 'Esta conta já foi ativada.', 400, 'CONTA_JA_ATIVADA');
      expect(exclusaoRepository.apagarTokensConvite).not.toHaveBeenCalled();
      expect(emailService.enviarConvite).not.toHaveBeenCalled();
    });

    it('recusa conta que nunca foi convidada', async () => {
      const { service, repository } = montar();
      repository.buscarPorId.mockResolvedValue({ ...pendente, convidadoEm: null });

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, 'Esta conta já foi ativada.', 400, 'CONTA_JA_ATIVADA');
    });

    it('apaga o link anterior antes de gerar o novo', async () => {
      const { service, repository, exclusaoRepository, auth } = montar();
      repository.buscarPorId.mockResolvedValue(pendente);
      repository.atualizar.mockResolvedValue(pendente);

      await service.reenviar(ID);

      const ordemApagar = exclusaoRepository.apagarTokensConvite.mock.invocationCallOrder[0];
      const ordemCriar = auth.internalAdapter.createVerificationValue.mock.invocationCallOrder[0];
      expect(exclusaoRepository.apagarTokensConvite).toHaveBeenCalledWith(ID);
      expect(ordemApagar).toBeLessThan(ordemCriar);
    });

    it('envia o novo token com o primeiro papel do usuário', async () => {
      const { service, repository, emailService } = montar();
      repository.buscarPorId.mockResolvedValue(pendente);
      repository.atualizar.mockResolvedValue(pendente);

      await service.reenviar(ID);

      expect(emailService.enviarConvite).toHaveBeenCalledWith({
        nome: 'Ana Recrutadora',
        email: 'ana@t.com',
        papel: 'recrutador',
        token: TOKEN,
      });
    });

    it('envia papel indefinido quando o usuário não tem permissões', async () => {
      const { service, repository, emailService } = montar();
      repository.buscarPorId.mockResolvedValue({ ...pendente, tipos_permissao: undefined });
      repository.atualizar.mockResolvedValue(pendente);

      await service.reenviar(ID);

      expect(emailService.enviarConvite.mock.calls[0][0].papel).toBeUndefined();
    });

    it('renova convidadoEm e devolve o usuário apresentado', async () => {
      const { service, repository } = montar();
      repository.buscarPorId.mockResolvedValue(pendente);
      repository.atualizar.mockResolvedValue({ ...pendente, senha: 'hash', convidadoEm: AGORA });

      const resultado = await service.reenviar(ID);

      expect(repository.atualizar).toHaveBeenCalledWith(ID, { convidadoEm: AGORA });
      expect(resultado).not.toHaveProperty('senha');
      expect(resultado).toMatchObject({ _id: ID, convidadoEm: AGORA, situacao: 'pendente' });
    });

    it('falha no envio apaga o token novo, mantém a conta e responde 502', async () => {
      const { service, repository, exclusaoRepository, emailService } = montar();
      repository.buscarPorId.mockResolvedValue(pendente);
      emailService.enviarConvite.mockRejectedValue(new Error('smtp fora'));

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, MENSAGEM_FALHA_ENVIO, 502, 'EMAIL_FALHOU');
      expect(exclusaoRepository.apagarTokensConvite).toHaveBeenCalledTimes(2);
      expect(repository.atualizar).not.toHaveBeenCalled();
      expect(repository.deletar).not.toHaveBeenCalled();
    });

    it('falha ao gerar o token também responde 502', async () => {
      const { service, repository, auth, emailService } = montar();
      repository.buscarPorId.mockResolvedValue(pendente);
      auth.internalAdapter.createVerificationValue.mockRejectedValue(new Error('verification fora'));

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, MENSAGEM_FALHA_ENVIO, 502, 'EMAIL_FALHOU');
      expect(emailService.enviarConvite).not.toHaveBeenCalled();
    });

    it('falha ao limpar os tokens depois do envio não esconde o 502', async () => {
      const { service, repository, exclusaoRepository, emailService } = montar();
      repository.buscarPorId.mockResolvedValue(pendente);
      emailService.enviarConvite.mockRejectedValue(new Error('smtp fora'));
      exclusaoRepository.apagarTokensConvite
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('banco fora'));

      const erro = await capturarErro(service.reenviar(ID));

      esperarAppError(erro, MENSAGEM_FALHA_ENVIO, 502, 'EMAIL_FALHOU');
    });
  });

  describe('ativar', () => {
    const pendente = {
      _id: ID,
      nome: 'Ana Recrutadora',
      email: 'ana@t.com',
      status_ativo: true,
      convidadoEm: new Date('2026-11-01T12:00:00.000Z'),
      ativadoEm: null,
    };

    const verificacaoValida = (expiresAt = new Date(AGORA.getTime() + 60 * 1000)) => ({ value: ID, expiresAt });

    it('procura a verificação pelo identificador do reset-password', async () => {
      const { service, auth } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(null);

      await capturarErro(service.ativar({ token: 'abc', senha: 'Nova@Senha1' }));

      expect(auth.internalAdapter.findVerificationValue).toHaveBeenCalledWith('reset-password:abc');
    });

    it('recusa token inexistente', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(null);

      const erro = await capturarErro(service.ativar({ token: 'nao-existe', senha: 'Nova@Senha1' }));

      esperarAppError(erro, MENSAGEM_TOKEN_INVALIDO, 400, 'TOKEN_INVALIDO');
      expect(repository.buscarPorId).not.toHaveBeenCalled();
    });

    it('recusa token vencido', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida(new Date(AGORA.getTime() - 1)));

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, MENSAGEM_TOKEN_INVALIDO, 400, 'TOKEN_INVALIDO');
      expect(repository.buscarPorId).not.toHaveBeenCalled();
    });

    it('aceita token que vence exatamente agora', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida(AGORA.toISOString()));
      repository.buscarPorId.mockResolvedValue(pendente);
      repository.atualizar.mockResolvedValue({ ...pendente, ativadoEm: AGORA });

      await expect(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' })).resolves.toMatchObject({ situacao: 'ativo' });
    });

    it('vence depois de 24 horas do convite', async () => {
      const { service, auth } = montar();
      await service.gerarToken(ID);
      const gravada = auth.internalAdapter.createVerificationValue.mock.calls[0][0];
      auth.internalAdapter.findVerificationValue.mockResolvedValue({ value: gravada.value, expiresAt: gravada.expiresAt });
      jest.setSystemTime(AGORA.getTime() + UM_DIA_MS + 1);

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, MENSAGEM_TOKEN_INVALIDO, 400, 'TOKEN_INVALIDO');
    });

    it('recusa token de usuário que não existe mais', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida());
      repository.buscarPorId.mockResolvedValue(null);

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, MENSAGEM_TOKEN_INVALIDO, 400, 'TOKEN_INVALIDO');
      expect(repository.buscarPorId).toHaveBeenCalledWith(ID);
    });

    it('recusa token de conta autoexcluída', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida());
      repository.buscarPorId.mockResolvedValue({ ...pendente, deletadoEm: AGORA });

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, MENSAGEM_TOKEN_INVALIDO, 400, 'TOKEN_INVALIDO');
    });

    it('recusa conta já ativada mesmo com token válido', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida());
      repository.buscarPorId.mockResolvedValue({ ...pendente, ativadoEm: AGORA });

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, 'Esta conta já foi ativada. Faça login.', 400, 'CONTA_JA_ATIVADA');
      expect(auth.api.resetPassword).not.toHaveBeenCalled();
    });

    it('recusa conta que não veio de convite', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida());
      repository.buscarPorId.mockResolvedValue({ ...pendente, convidadoEm: undefined });

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, 'Esta conta já foi ativada. Faça login.', 400, 'CONTA_JA_ATIVADA');
    });

    it('define a senha pelo resetPassword e marca ativadoEm', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida());
      repository.buscarPorId.mockResolvedValue(pendente);
      repository.atualizar.mockResolvedValue({ ...pendente, senha: 'hash', ativadoEm: AGORA });

      const resultado = await service.ativar({ token: TOKEN, senha: 'Nova@Senha1' });

      expect(auth.api.resetPassword).toHaveBeenCalledWith({ body: { token: TOKEN, newPassword: 'Nova@Senha1' } });
      expect(repository.atualizar).toHaveBeenCalledWith(ID, { ativadoEm: AGORA });
      expect(resultado).not.toHaveProperty('senha');
      expect(resultado).toMatchObject({ _id: ID, ativadoEm: AGORA, situacao: 'ativo' });
    });

    it('trata falha do resetPassword, como token já consumido, como token inválido', async () => {
      const { service, auth, repository } = montar();
      auth.internalAdapter.findVerificationValue.mockResolvedValue(verificacaoValida());
      repository.buscarPorId.mockResolvedValue(pendente);
      auth.api.resetPassword.mockRejectedValue(new Error('INVALID_TOKEN'));

      const erro = await capturarErro(service.ativar({ token: TOKEN, senha: 'Nova@Senha1' }));

      esperarAppError(erro, MENSAGEM_TOKEN_INVALIDO, 400, 'TOKEN_INVALIDO');
      expect(repository.atualizar).not.toHaveBeenCalled();
    });
  });
});

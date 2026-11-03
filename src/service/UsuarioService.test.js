import UsuarioService from './UsuarioService.js';
import AppError from '../utils/helpers/AppError.js';
import { auth } from '../utils/auth.js';
import Grupo from '../models/Grupo.js';

jest.mock('../utils/auth.js', () => ({
  auth: { api: { signUpEmail: jest.fn().mockResolvedValue({}) } },
}));

jest.mock('../models/Grupo.js', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

const ID = '64b7f0c2a1b2c3d4e5f60718';
const ADMIN_ID = '64b7f0c2a1b2c3d4e5f60719';

const criarColaboradores = () => ({
  repository: {
    listarPaginado: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorEmail: jest.fn().mockResolvedValue(null),
    atualizarPorEmail: jest.fn(),
    atualizar: jest.fn(),
    anonimizar: jest.fn().mockResolvedValue(undefined),
    contarAdministradoresAtivos: jest.fn(),
    deletar: jest.fn().mockResolvedValue(undefined),
  },
  exclusaoRepository: {
    revogarAcesso: jest.fn().mockResolvedValue(undefined),
    removerCurriculo: jest.fn().mockResolvedValue(undefined),
    revogarSessoes: jest.fn().mockResolvedValue(undefined),
    apagarTokensConvite: jest.fn().mockResolvedValue(undefined),
  },
});

const gruposEncontrados = (grupos) => {
  const lean = jest.fn().mockResolvedValue(grupos);
  const select = jest.fn(() => ({ lean }));
  Grupo.find.mockReturnValue({ select });
  return { select, lean };
};

const erroDe = (mensagem, statusCode, code) =>
  expect.objectContaining({ constructor: AppError, message: mensagem, statusCode, code });

describe('UsuarioService', () => {
  let colaboradores;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    colaboradores = criarColaboradores();
    service = new UsuarioService(colaboradores.repository, colaboradores.exclusaoRepository);
  });

  describe('sanitize', () => {
    it('remove __v e senha', () => {
      expect(service.sanitize({ _id: ID, __v: 0, nome: 'Ana', senha: 'x' })).toEqual({ _id: ID, nome: 'Ana' });
    });
  });

  describe('listar', () => {
    const pagina = {
      docs: [
        { _id: ID, __v: 0, senha: 's', status_ativo: true },
        { _id: ADMIN_ID, status_ativo: false },
        { _id: 'u3', convidadoEm: new Date(), ativadoEm: null },
      ],
      totalDocs: 3,
    };

    it('administrador lista sem recorte e recebe a situação de cada conta', async () => {
      colaboradores.repository.listarPaginado.mockResolvedValue(pagina);

      const resultado = await service.listar({ page: 2 }, ['administrador']);

      expect(colaboradores.repository.listarPaginado).toHaveBeenCalledWith({ page: 2 });
      expect(resultado.totalDocs).toBe(3);
      expect(resultado.docs.map((u) => u.situacao)).toEqual(['ativo', 'desativado', 'pendente']);
      expect(resultado.docs[0]).not.toHaveProperty('senha');
      expect(resultado.docs[0]).not.toHaveProperty('__v');
    });

    it.each([[['recrutador']], [[]], [undefined]])('sem papel de administrador (%p), só enxerga candidatos', async (papeis) => {
      colaboradores.repository.listarPaginado.mockResolvedValue({ docs: [] });

      await service.listar({ page: 1, papel: 'administrador' }, papeis);

      expect(colaboradores.repository.listarPaginado).toHaveBeenCalledWith({ page: 1, papel: 'candidato' });
    });
  });

  describe('buscarPorId', () => {
    it('rejeita ID inválido', async () => {
      await expect(service.buscarPorId('xyz')).rejects.toEqual(
        erroDe('ID de usuário inválido.', 400, 'VALIDATION_ERROR'),
      );
      expect(colaboradores.repository.buscarPorId).not.toHaveBeenCalled();
    });

    it('lança 404 quando o usuário não existe', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue(null);

      await expect(service.buscarPorId(ID)).rejects.toEqual(erroDe('Usuário não encontrado.', 404, 'NOT_FOUND'));
    });

    it('devolve o usuário sem a senha', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, nome: 'Ana', senha: 'x' });

      await expect(service.buscarPorId(ID)).resolves.toEqual({ _id: ID, nome: 'Ana' });
    });
  });

  describe('provisionarComAuth', () => {
    const dados = { nome: 'Ana', email: 'ana@x.com', senha: 'Segura123', tipos_permissao: ['recrutador'] };

    it('lança conflito quando o e-mail já existe, sem criar conta no Better Auth', async () => {
      colaboradores.repository.buscarPorEmail.mockResolvedValue({ _id: ID });

      await expect(service.provisionarComAuth(dados)).rejects.toEqual(
        erroDe('Já existe usuário com este e-mail.', 409, 'CONFLICT'),
      );
      expect(auth.api.signUpEmail).not.toHaveBeenCalled();
      expect(colaboradores.repository.atualizarPorEmail).not.toHaveBeenCalled();
    });

    it('cria a conta no Better Auth e vincula papéis, grupos e contato vazio', async () => {
      const { select } = gruposEncontrados([{ _id: 'g1' }, { _id: 'g2' }]);
      colaboradores.repository.atualizarPorEmail.mockResolvedValue({ _id: ID, email: dados.email, senha: 'h', __v: 0 });

      const resultado = await service.provisionarComAuth(dados);

      expect(colaboradores.repository.buscarPorEmail).toHaveBeenCalledWith('ana@x.com');
      expect(auth.api.signUpEmail).toHaveBeenCalledWith({
        body: { email: 'ana@x.com', password: 'Segura123', name: 'Ana' },
      });
      expect(Grupo.find).toHaveBeenCalledWith({ nome: { $in: ['recrutador'] } });
      expect(select).toHaveBeenCalledWith('_id');
      expect(colaboradores.repository.atualizarPorEmail).toHaveBeenCalledWith('ana@x.com', {
        tipos_permissao: ['recrutador'],
        status_ativo: true,
        groups: ['g1', 'g2'],
        telefone: '',
        linkedin: '',
        cidade: '',
      });
      expect(resultado).toEqual({ _id: ID, email: 'ana@x.com' });
    });

    it('grava o contato e o status informados na criação administrativa', async () => {
      gruposEncontrados([]);
      colaboradores.repository.atualizarPorEmail.mockResolvedValue({ _id: ID });

      await service.provisionarComAuth({
        ...dados,
        status_ativo: false,
        telefone: '11999990000',
        linkedin: 'linkedin.com/in/ana',
        cidade: 'Campinas',
      });

      expect(colaboradores.repository.atualizarPorEmail).toHaveBeenCalledWith(
        'ana@x.com',
        expect.objectContaining({
          status_ativo: false,
          groups: [],
          telefone: '11999990000',
          linkedin: 'linkedin.com/in/ana',
          cidade: 'Campinas',
        }),
      );
    });

    it('propaga a falha do Better Auth sem tocar no documento do usuário', async () => {
      auth.api.signUpEmail.mockRejectedValueOnce(new Error('senha fraca'));

      await expect(service.provisionarComAuth(dados)).rejects.toThrow('senha fraca');
      expect(Grupo.find).not.toHaveBeenCalled();
      expect(colaboradores.repository.atualizarPorEmail).not.toHaveBeenCalled();
    });
  });

  describe('registrarCandidato', () => {
    it.each([
      [{ email: 'a@x.com', senha: 's' }],
      [{ nome: 'Ana', senha: 's' }],
      [{ nome: 'Ana', email: 'a@x.com' }],
      [{ nome: '', email: 'a@x.com', senha: 's' }],
    ])('exige nome, e-mail e senha (%p)', async (dados) => {
      await expect(service.registrarCandidato(dados)).rejects.toEqual(
        erroDe('nome, e-mail e senha são obrigatórios.', 400, 'VALIDATION_ERROR'),
      );
      expect(colaboradores.repository.buscarPorEmail).not.toHaveBeenCalled();
    });

    it('provisiona sempre como candidato ativo, ignorando papéis enviados', async () => {
      const espiao = jest.spyOn(service, 'provisionarComAuth').mockResolvedValue({ _id: ID });

      await expect(
        service.registrarCandidato({ nome: 'Ana', email: 'a@x.com', senha: 's', tipos_permissao: ['administrador'] }),
      ).resolves.toEqual({ _id: ID });
      expect(espiao).toHaveBeenCalledWith({
        nome: 'Ana',
        email: 'a@x.com',
        senha: 's',
        tipos_permissao: ['candidato'],
        status_ativo: true,
      });
    });
  });

  describe('criar', () => {
    it('repassa o payload ao provisionamento', async () => {
      const espiao = jest.spyOn(service, 'provisionarComAuth').mockResolvedValue({ _id: ID });
      const payload = { nome: 'Bia', email: 'b@x.com', senha: 's', tipos_permissao: ['suporte'] };

      await expect(service.criar(payload)).resolves.toEqual({ _id: ID });
      expect(espiao).toHaveBeenCalledWith(payload);
    });
  });

  describe('atualizar', () => {
    beforeEach(() => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, email: 'ana@x.com' });
    });

    it('rejeita ID inválido', async () => {
      await expect(service.atualizar('1', {})).rejects.toEqual(
        erroDe('ID de usuário inválido.', 400, 'VALIDATION_ERROR'),
      );
    });

    it('lança 404 quando o usuário não existe', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue(null);

      await expect(service.atualizar(ID, { nome: 'x' })).rejects.toEqual(
        erroDe('Usuário não encontrado.', 404, 'NOT_FOUND'),
      );
    });

    it('bloqueia troca para e-mail de outro usuário', async () => {
      colaboradores.repository.buscarPorEmail.mockResolvedValue({ _id: ADMIN_ID });

      await expect(service.atualizar(ID, { email: 'outro@x.com' })).rejects.toEqual(
        erroDe('Já existe usuário com este e-mail.', 409, 'CONFLICT'),
      );
      expect(colaboradores.repository.buscarPorEmail).toHaveBeenCalledWith('outro@x.com');
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
    });

    it('não consulta duplicidade quando o e-mail não muda', async () => {
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, email: 'ana@x.com' });

      await service.atualizar(ID, { email: 'ana@x.com', nome: 'Ana' });

      expect(colaboradores.repository.buscarPorEmail).not.toHaveBeenCalled();
    });

    it('aceita e-mail novo livre', async () => {
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, email: 'novo@x.com' });

      await expect(service.atualizar(ID, { email: 'novo@x.com' })).resolves.toEqual({ _id: ID, email: 'novo@x.com' });
    });

    it('repassa o payload ao repositório e nunca devolve a senha', async () => {
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, nome: 'Ana', senha: 'legado' });

      await expect(service.atualizar(ID, { nome: 'Ana' })).resolves.toEqual({ _id: ID, nome: 'Ana' });
      expect(colaboradores.repository.atualizar).toHaveBeenCalledWith(ID, { nome: 'Ana' });
    });
  });

  describe('excluirPropriaConta', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: Date.parse('2026-11-02T12:00:00Z') });
      colaboradores.repository.buscarPorId.mockResolvedValue({
        _id: ID,
        email: 'Ana@X.com',
        tipos_permissao: ['candidato'],
      });
    });

    afterEach(() => jest.useRealTimers());

    it('rejeita ID inválido', async () => {
      await expect(service.excluirPropriaConta('x', { emailConfirmacao: 'a' })).rejects.toEqual(
        erroDe('ID de usuário inválido.', 400, 'VALIDATION_ERROR'),
      );
    });

    it.each([[null], [{ _id: ID, email: 'ana@x.com', deletadoEm: new Date() }]])(
      'conta inexistente ou já excluída vira 404 (%p)',
      async (usuario) => {
        colaboradores.repository.buscarPorId.mockResolvedValue(usuario);

        await expect(service.excluirPropriaConta(ID, { emailConfirmacao: 'ana@x.com' })).rejects.toEqual(
          erroDe('Usuário não encontrado.', 404, 'NOT_FOUND'),
        );
      },
    );

    it.each([[undefined], [{}], [{ emailConfirmacao: '   ' }], [{ emailConfirmacao: 42 }]])(
      'exige o e-mail de confirmação (%p)',
      async (opcoes) => {
        await expect(service.excluirPropriaConta(ID, opcoes)).rejects.toEqual(
          erroDe('Informe o e-mail da conta para confirmar a exclusão.', 400, 'VALIDATION_ERROR'),
        );
      },
    );

    it('recusa e-mail de confirmação diferente do da conta', async () => {
      await expect(service.excluirPropriaConta(ID, { emailConfirmacao: 'outra@x.com' })).rejects.toEqual(
        erroDe('O e-mail informado não confere com o da conta.', 400, 'CONFIRMACAO_INVALIDA'),
      );
      expect(colaboradores.repository.anonimizar).not.toHaveBeenCalled();
    });

    it('anonimiza, revoga acesso e remove o currículo, aceitando e-mail com caixa e espaços diferentes', async () => {
      const resultado = await service.excluirPropriaConta(ID, { emailConfirmacao: '  ANA@x.COM ' });

      expect(colaboradores.repository.anonimizar).toHaveBeenCalledWith(ID, {
        nome: 'Conta excluída',
        email: `excluido+${ID}@conta-removida.invalido`,
        deletadoEm: new Date(Date.parse('2026-11-02T12:00:00Z')),
      });
      expect(colaboradores.exclusaoRepository.revogarAcesso).toHaveBeenCalledWith(ID);
      expect(colaboradores.exclusaoRepository.removerCurriculo).toHaveBeenCalledWith(ID);
      expect(colaboradores.repository.contarAdministradoresAtivos).not.toHaveBeenCalled();
      expect(resultado).toEqual({ id: ID, deletado: true });
    });

    it('anonimiza antes de revogar o acesso', async () => {
      await service.excluirPropriaConta(ID, { emailConfirmacao: 'ana@x.com' });

      const ordemAnonimizar = colaboradores.repository.anonimizar.mock.invocationCallOrder[0];
      const ordemRevogar = colaboradores.exclusaoRepository.revogarAcesso.mock.invocationCallOrder[0];
      expect(ordemAnonimizar).toBeLessThan(ordemRevogar);
    });

    it('impede o último administrador ativo de se excluir', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({
        _id: ID,
        email: 'ana@x.com',
        tipos_permissao: ['administrador'],
      });
      colaboradores.repository.contarAdministradoresAtivos.mockResolvedValue(1);

      await expect(service.excluirPropriaConta(ID, { emailConfirmacao: 'ana@x.com' })).rejects.toEqual(
        erroDe(
          'Você é o único administrador ativo. Promova outro administrador antes de excluir sua conta.',
          409,
          'ULTIMO_ADMINISTRADOR',
        ),
      );
      expect(colaboradores.repository.anonimizar).not.toHaveBeenCalled();
      expect(colaboradores.exclusaoRepository.revogarAcesso).not.toHaveBeenCalled();
    });

    it('administrador pode se excluir quando há outro ativo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({
        _id: ID,
        email: 'ana@x.com',
        tipos_permissao: ['administrador'],
      });
      colaboradores.repository.contarAdministradoresAtivos.mockResolvedValue(2);

      await expect(service.excluirPropriaConta(ID, { emailConfirmacao: 'ana@x.com' })).resolves.toEqual({
        id: ID,
        deletado: true,
      });
    });
  });

  describe('alterarStatus', () => {
    beforeEach(() => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['recrutador'] });
    });

    it('rejeita ID inválido', async () => {
      await expect(service.alterarStatus('x', { status_ativo: false }, ADMIN_ID)).rejects.toEqual(
        erroDe('ID de usuário inválido.', 400, 'VALIDATION_ERROR'),
      );
    });

    it.each([[null], [{ _id: ID, deletadoEm: new Date() }]])('conta inexistente ou excluída vira 404 (%p)', async (usuario) => {
      colaboradores.repository.buscarPorId.mockResolvedValue(usuario);

      await expect(service.alterarStatus(ID, { status_ativo: true }, ADMIN_ID)).rejects.toEqual(
        erroDe('Usuário não encontrado.', 404, 'NOT_FOUND'),
      );
    });

    it('impede desativar a própria conta', async () => {
      await expect(service.alterarStatus(ID, { status_ativo: false }, ID)).rejects.toEqual(
        erroDe('Você não pode desativar a própria conta.', 409, 'AUTODESATIVACAO'),
      );
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
    });

    it('impede desativar o último administrador ativo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['administrador'] });
      colaboradores.repository.contarAdministradoresAtivos.mockResolvedValue(1);

      await expect(service.alterarStatus(ID, { status_ativo: false }, ADMIN_ID)).rejects.toEqual(
        erroDe(
          'Este é o único administrador ativo. Ative outro administrador antes de desativá-lo.',
          409,
          'ULTIMO_ADMINISTRADOR',
        ),
      );
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
      expect(colaboradores.exclusaoRepository.revogarSessoes).not.toHaveBeenCalled();
    });

    it('desativa, revoga as sessões e devolve a situação desativado', async () => {
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, status_ativo: false, senha: 'h' });

      const resultado = await service.alterarStatus(ID, { status_ativo: false }, ADMIN_ID);

      expect(colaboradores.repository.atualizar).toHaveBeenCalledWith(ID, { status_ativo: false });
      expect(colaboradores.exclusaoRepository.revogarSessoes).toHaveBeenCalledWith(ID);
      expect(resultado).toEqual({ _id: ID, status_ativo: false, situacao: 'desativado' });
    });

    it('desativa administrador quando há outro ativo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['administrador'] });
      colaboradores.repository.contarAdministradoresAtivos.mockResolvedValue(3);
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, status_ativo: false });

      await expect(service.alterarStatus(ID, { status_ativo: false }, ADMIN_ID)).resolves.toMatchObject({
        situacao: 'desativado',
      });
    });

    it('reativar, inclusive a própria conta, não checa administradores nem revoga sessões', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['administrador'] });
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, status_ativo: true });

      const resultado = await service.alterarStatus(ID, { status_ativo: true }, ID);

      expect(colaboradores.repository.contarAdministradoresAtivos).not.toHaveBeenCalled();
      expect(colaboradores.exclusaoRepository.revogarSessoes).not.toHaveBeenCalled();
      expect(resultado).toEqual({ _id: ID, status_ativo: true, situacao: 'ativo' });
    });
  });

  describe('deletar', () => {
    beforeEach(() => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['candidato'] });
    });

    it('rejeita ID inválido', async () => {
      await expect(service.deletar('x', ADMIN_ID)).rejects.toEqual(
        erroDe('ID de usuário inválido.', 400, 'VALIDATION_ERROR'),
      );
    });

    it('impede excluir a própria conta pela rota administrativa, sem consultar o banco', async () => {
      await expect(service.deletar(ID, ID)).rejects.toEqual(
        erroDe(
          'Você não pode excluir a própria conta por aqui. Use a exclusão da própria conta no perfil.',
          409,
          'AUTOEXCLUSAO',
        ),
      );
      expect(colaboradores.repository.buscarPorId).not.toHaveBeenCalled();
    });

    it.each([[null], [{ _id: ID, deletadoEm: new Date() }]])('conta inexistente ou anonimizada vira 404 (%p)', async (usuario) => {
      colaboradores.repository.buscarPorId.mockResolvedValue(usuario);

      await expect(service.deletar(ID, ADMIN_ID)).rejects.toEqual(erroDe('Usuário não encontrado.', 404, 'NOT_FOUND'));
      expect(colaboradores.repository.deletar).not.toHaveBeenCalled();
    });

    it('impede excluir o último administrador ativo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['administrador'] });
      colaboradores.repository.contarAdministradoresAtivos.mockResolvedValue(1);

      await expect(service.deletar(ID, ADMIN_ID)).rejects.toEqual(
        erroDe(
          'Este é o único administrador ativo. Ative outro administrador antes de excluí-lo.',
          409,
          'ULTIMO_ADMINISTRADOR',
        ),
      );
      expect(colaboradores.exclusaoRepository.apagarTokensConvite).not.toHaveBeenCalled();
      expect(colaboradores.repository.deletar).not.toHaveBeenCalled();
    });

    it('apaga convites, revoga acesso e remove o documento, nessa ordem', async () => {
      await expect(service.deletar(ID, ADMIN_ID)).resolves.toEqual({ id: ID, deletado: true });

      const { apagarTokensConvite, revogarAcesso } = colaboradores.exclusaoRepository;
      expect(apagarTokensConvite).toHaveBeenCalledWith(ID);
      expect(revogarAcesso).toHaveBeenCalledWith(ID);
      expect(colaboradores.repository.deletar).toHaveBeenCalledWith(ID);
      expect(apagarTokensConvite.mock.invocationCallOrder[0]).toBeLessThan(revogarAcesso.mock.invocationCallOrder[0]);
      expect(revogarAcesso.mock.invocationCallOrder[0]).toBeLessThan(
        colaboradores.repository.deletar.mock.invocationCallOrder[0],
      );
    });

    it('exclui administrador quando há outro ativo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, tipos_permissao: ['administrador'] });
      colaboradores.repository.contarAdministradoresAtivos.mockResolvedValue(2);

      await expect(service.deletar(ID, ADMIN_ID)).resolves.toEqual({ id: ID, deletado: true });
    });
  });
});

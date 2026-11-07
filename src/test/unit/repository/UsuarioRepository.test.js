import UsuarioRepository from '../../../repository/UsuarioRepository.js';
import Usuario from '../../../models/Usuario.js';

const opcoes = (page, limit) => ({ page, limit, sort: { createdAt: -1 }, lean: true, leanWithId: true });

describe('UsuarioRepository', () => {
  const repo = new UsuarioRepository();

  afterEach(() => jest.restoreAllMocks());

  describe('listarPaginado', () => {
    beforeEach(() => jest.spyOn(Usuario, 'paginate').mockResolvedValue({ docs: [] }));

    it('sem argumentos esconde contas excluídas e usa a primeira página de 10', async () => {
      await expect(repo.listarPaginado()).resolves.toEqual({ docs: [] });
      expect(Usuario.paginate).toHaveBeenCalledWith({ deletadoEm: null }, opcoes(1, 10));
    });

    it.each([
      ['lista de papéis vira $in', ['recrutador', 'suporte'], { $in: ['recrutador', 'suporte'] }],
      ['papel único casa direto', 'candidato', 'candidato'],
    ])('%s', async (_, papel, esperado) => {
      await repo.listarPaginado({ papel });

      expect(Usuario.paginate).toHaveBeenCalledWith({ deletadoEm: null, tipos_permissao: esperado }, opcoes(1, 10));
    });

    it.each([true, false])('status_ativo %s filtra pelo booleano', async (status_ativo) => {
      await repo.listarPaginado({ status_ativo });

      expect(Usuario.paginate).toHaveBeenCalledWith({ deletadoEm: null, status_ativo }, opcoes(1, 10));
    });

    it('status_ativo que não é booleano é ignorado', async () => {
      await repo.listarPaginado({ status_ativo: 'true' });

      expect(Usuario.paginate).toHaveBeenCalledWith({ deletadoEm: null }, opcoes(1, 10));
    });

    it('combina situação, e-mail, nome e paginação informada', async () => {
      await repo.listarPaginado({ page: 2, limit: 5, email: 'ana.m@', nome: 'Ana (TI)', situacao: 'desativado' });

      expect(Usuario.paginate).toHaveBeenCalledWith(
        {
          deletadoEm: null,
          status_ativo: false,
          email: { $regex: 'ana\\.m@', $options: 'i' },
          nome: { $regex: 'Ana \\(TI\\)', $options: 'i' },
        },
        opcoes(2, 5),
      );
    });
  });

  it('anonimiza sobrescrevendo os dados pessoais e desativando a conta', async () => {
    const deletadoEm = new Date('2026-11-02T12:00:00.000Z');
    jest.spyOn(Usuario, 'findByIdAndUpdate').mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'u1' }) });

    await expect(repo.anonimizar('u1', { nome: 'Anônimo', email: 'x@anon', deletadoEm })).resolves.toEqual({ _id: 'u1' });
    expect(Usuario.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      {
        $set: {
          nome: 'Anônimo',
          email: 'x@anon',
          senha: null,
          telefone: '',
          linkedin: '',
          cidade: '',
          status_ativo: false,
          groups: [],
          permissions: [],
          deletadoEm,
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('conta só administradores ativos e não excluídos', async () => {
    jest.spyOn(Usuario, 'countDocuments').mockResolvedValue(2);

    await expect(repo.contarAdministradoresAtivos()).resolves.toBe(2);
    expect(Usuario.countDocuments).toHaveBeenCalledWith({
      tipos_permissao: 'administrador',
      status_ativo: true,
      deletadoEm: null,
    });
  });

  it('criar repassa o payload', async () => {
    jest.spyOn(Usuario, 'create').mockResolvedValue({ _id: 'u1' });

    await expect(repo.criar({ email: 'a@b' })).resolves.toEqual({ _id: 'u1' });
    expect(Usuario.create).toHaveBeenCalledWith({ email: 'a@b' });
  });

  it.each([
    ['buscarPorId', 'findById', ['u1'], ['u1']],
    ['buscarPorEmail', 'findOne', ['a@b'], [{ email: 'a@b' }]],
    [
      'atualizar',
      'findByIdAndUpdate',
      ['u1', { nome: 'Ana' }],
      ['u1', { nome: 'Ana' }, { returnDocument: 'after', runValidators: true }],
    ],
    [
      'atualizarPorEmail',
      'findOneAndUpdate',
      ['a@b', { nome: 'Ana' }],
      [{ email: 'a@b' }, { nome: 'Ana' }, { returnDocument: 'after', runValidators: true }],
    ],
    ['deletar', 'findByIdAndDelete', ['u1'], ['u1']],
  ])('%s usa %s com os argumentos esperados', async (metodo, estatico, args, esperado) => {
    jest.spyOn(Usuario, estatico).mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'u1' }) });

    await expect(repo[metodo](...args)).resolves.toEqual({ _id: 'u1' });
    expect(Usuario[estatico]).toHaveBeenCalledWith(...esperado);
  });
});

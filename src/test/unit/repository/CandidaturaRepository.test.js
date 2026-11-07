import CandidaturaRepository from '../../../repository/CandidaturaRepository.js';
import Candidatura from '../../../models/Candidatura.js';

describe('CandidaturaRepository', () => {
  const repo = new CandidaturaRepository();
  let q;

  beforeEach(() => {
    q = { sort: jest.fn(), lean: jest.fn().mockResolvedValue([{ id: 'c1' }]) };
    q.sort.mockReturnValue(q);
    jest.spyOn(Candidatura, 'find').mockReturnValue(q);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['sem argumentos', undefined, {}],
    ['com objeto vazio', {}, {}],
    ['só pendentes', { apenasPendentes: true }, { avaliadoEm: null }],
    ['por vaga', { vagaId: 'v1' }, { vagaId: 'v1' }],
    ['pendentes da vaga', { apenasPendentes: true, vagaId: 'v1' }, { avaliadoEm: null, vagaId: 'v1' }],
  ])('auditoria %s filtra por %j, avaliadas mais recentes primeiro', async (_, args, filtro) => {
    await expect(repo.listarParaAuditoria(args)).resolves.toEqual([{ id: 'c1' }]);

    expect(Candidatura.find).toHaveBeenCalledWith(filtro);
    expect(q.sort).toHaveBeenCalledWith({ avaliadoEm: -1, criadoEm: -1 });
  });

  it.each([
    ['do usuário, mais recentes primeiro', 'listarPorUsuarioId', 'u1', { usuarioId: 'u1' }, { criadoEm: -1 }],
    ['da vaga, em ordem de chegada', 'listarPorVagaId', 'v1', { vagaId: 'v1' }, { criadoEm: 1 }],
  ])('lista candidaturas %s', async (_, metodo, arg, filtro, ordem) => {
    await expect(repo[metodo](arg)).resolves.toEqual([{ id: 'c1' }]);

    expect(Candidatura.find).toHaveBeenCalledWith(filtro);
    expect(q.sort).toHaveBeenCalledWith(ordem);
  });

  it('cria a candidatura com o payload', async () => {
    jest.spyOn(Candidatura, 'create').mockResolvedValue({ id: 'c1' });

    await expect(repo.criar({ usuarioId: 'u1' })).resolves.toEqual({ id: 'c1' });
    expect(Candidatura.create).toHaveBeenCalledWith({ usuarioId: 'u1' });
  });

  it.each([
    ['buscarPorUsuarioEVaga', 'findOne', ['u1', 'v1'], [{ usuarioId: 'u1', vagaId: 'v1' }]],
    ['buscarPorId', 'findOne', ['c1'], [{ id: 'c1' }]],
    [
      'atualizarPorUsuarioEVaga',
      'findOneAndUpdate',
      ['u1', 'v1', { status: 'aprovado' }],
      [{ usuarioId: 'u1', vagaId: 'v1' }, { status: 'aprovado' }, { returnDocument: 'after', runValidators: true }],
    ],
    ['deletarPorUsuarioEVaga', 'findOneAndDelete', ['u1', 'v1'], [{ usuarioId: 'u1', vagaId: 'v1' }]],
  ])('%s usa %s com os argumentos esperados', async (metodo, estatico, args, esperado) => {
    jest.spyOn(Candidatura, estatico).mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'c1' }) });

    await expect(repo[metodo](...args)).resolves.toEqual({ id: 'c1' });
    expect(Candidatura[estatico]).toHaveBeenCalledWith(...esperado);
  });
});

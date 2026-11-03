import CandidaturaRepository from './CandidaturaRepository.js';
import Candidatura from '../models/Candidatura.js';

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
});

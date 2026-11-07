import RelatorioService from '../../../service/RelatorioService.js';
import Candidatura from '../../../models/Candidatura.js';
import Vaga from '../../../models/Vaga.js';
import Usuario from '../../../models/Usuario.js';
import AppError from '../../../utils/helpers/AppError.js';

const AGORA = new Date('2026-11-02T12:00:00.000Z');
const INICIO_30D = new Date('2026-10-03T12:00:00.000Z');
const VAGA_ID = '64b7f0c2a1b2c3d4e5f60718';
const ANA_ID = '64b7f0c2a1b2c3d4e5f60721';
const BRUNO_ID = '64b7f0c2a1b2c3d4e5f60722';
const REMOVIDO_ID = '64b7f0c2a1b2c3d4e5f60723';

const comLean = (valor) => ({ lean: jest.fn().mockResolvedValue(valor) });

const grupos = (contagem) => Object.entries(contagem).map(([_id, total]) => ({ _id, total }));

const montar = () => {
  const candidaturaModel = { aggregate: jest.fn().mockResolvedValue([]), find: jest.fn().mockReturnValue(comLean([])) };
  const vagaModel = { aggregate: jest.fn().mockResolvedValue([]), findById: jest.fn() };
  const usuarioModel = { find: jest.fn().mockReturnValue(comLean([])) };
  const service = new RelatorioService({ candidaturaModel, vagaModel, usuarioModel });
  return { service, candidaturaModel, vagaModel, usuarioModel };
};

const agregacaoDeVagas = (porCampo) => (pipeline) => Promise.resolve(porCampo[pipeline[1].$group._id] ?? []);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(AGORA.getTime());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('RelatorioService', () => {
  describe('construtor', () => {
    it('usa os models padrão quando nada é injetado', () => {
      const service = new RelatorioService();

      expect(service.Candidatura).toBe(Candidatura);
      expect(service.Vaga).toBe(Vaga);
      expect(service.Usuario).toBe(Usuario);
    });
  });

  describe('resumirCandidaturas', () => {
    it('conta por status, ignora status desconhecido e calcula a taxa sobre as decididas', async () => {
      const { service, candidaturaModel } = montar();
      candidaturaModel.aggregate.mockResolvedValue(grupos({ inscrito: 2, aprovado: 3, reprovado: 1, fantasma: 9 }));

      const resumo = await service.resumirCandidaturas({ vagaId: VAGA_ID });

      expect(candidaturaModel.aggregate).toHaveBeenCalledWith([
        { $match: { vagaId: VAGA_ID } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]);
      expect(resumo.total).toBe(6);
      expect(resumo.porStatus).toMatchObject({ inscrito: 2, em_analise: 0, aprovado: 3, reprovado: 1 });
      expect(resumo.porStatus).not.toHaveProperty('fantasma');
      expect(resumo.taxaAprovacao).toBe(0.75);
    });

    it('devolve taxa nula quando nenhuma candidatura foi decidida', async () => {
      const { service, candidaturaModel } = montar();
      candidaturaModel.aggregate.mockResolvedValue(grupos({ inscrito: 4 }));

      const resumo = await service.resumirCandidaturas({});

      expect(resumo).toMatchObject({ total: 4, taxaAprovacao: null });
    });
  });

  describe('geral', () => {
    it('filtra pelo período e agrega vagas, candidaturas e série semanal', async () => {
      const { service, candidaturaModel, vagaModel } = montar();
      vagaModel.aggregate.mockImplementation(
        agregacaoDeVagas({
          $status: grupos({ ativa: 3, pausada: 1, desconhecido: 0 }),
          $area: grupos({ dados: 1, back: 2, front: 1 }),
        }),
      );
      candidaturaModel.aggregate.mockResolvedValue(grupos({ aprovado: 1 }));
      candidaturaModel.find.mockReturnValue(comLean([{ criadoEm: new Date('2026-10-20T10:00:00.000Z') }]));

      const relatorio = await service.geral('30d', AGORA);

      expect(vagaModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([{ $match: { createdAt: { $gte: INICIO_30D } } }]),
      );
      expect(candidaturaModel.find).toHaveBeenCalledWith({ criadoEm: { $gte: INICIO_30D } }, 'criadoEm');
      expect(relatorio).toMatchObject({
        periodo: '30d',
        geradoEm: AGORA.toISOString(),
        vagas: {
          total: 4,
          porStatus: { ativa: 3, pausada: 1, arquivada: 0 },
          porArea: [
            { area: 'back', total: 2 },
            { area: 'dados', total: 1 },
            { area: 'front', total: 1 },
          ],
        },
        candidaturas: { total: 1, taxaAprovacao: 1 },
      });
      expect(relatorio.vagas.porStatus).not.toHaveProperty('desconhecido');
      expect(relatorio.serie.granularidade).toBe('semana');
      expect(relatorio.serie.pontos).toHaveLength(6);
      expect(relatorio.serie.pontos).toContainEqual({ inicio: '2026-10-19', total: 1 });
    });

    it('sem recorte de período não filtra e usa a data atual quando agora não é informado', async () => {
      const { service, candidaturaModel, vagaModel } = montar();

      const relatorio = await service.geral('tudo');

      expect(vagaModel.aggregate).toHaveBeenCalledWith(expect.arrayContaining([{ $match: {} }]));
      expect(candidaturaModel.find).toHaveBeenCalledWith({}, 'criadoEm');
      expect(relatorio).toMatchObject({
        geradoEm: AGORA.toISOString(),
        vagas: { total: 0, porArea: [] },
        candidaturas: { total: 0, taxaAprovacao: null },
        serie: { granularidade: 'mes', pontos: [] },
      });
    });
  });

  describe('porVaga', () => {
    it.each([
      ['o id não tem formato de ObjectId', 'abc', false],
      ['a vaga não existe', VAGA_ID, true],
    ])('lança 404 quando %s', async (_caso, vagaId, consulta) => {
      const { service, vagaModel } = montar();
      vagaModel.findById.mockReturnValue(comLean(null));

      await expect(service.porVaga(vagaId, '30d', AGORA)).rejects.toMatchObject({
        constructor: AppError,
        message: 'Vaga não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(vagaModel.findById).toHaveBeenCalledTimes(consulta ? 1 : 0);
    });

    it('lista candidatos por etapa e data, com nome nulo para usuário removido', async () => {
      const { service, candidaturaModel, vagaModel, usuarioModel } = montar();
      const criadoEm = new Date('2026-09-01T00:00:00.000Z');
      vagaModel.findById.mockReturnValue(
        comLean({ _id: VAGA_ID, titulo: 'Dev', area: 'back', status: 'ativa', createdAt: criadoEm }),
      );
      candidaturaModel.aggregate.mockResolvedValue(grupos({ inscrito: 2, aprovado: 1, em_analise: 1 }));
      const d1 = new Date('2026-10-10T00:00:00.000Z');
      const d2 = new Date('2026-10-12T00:00:00.000Z');
      const d3 = new Date('2026-10-14T00:00:00.000Z');
      candidaturaModel.find.mockReturnValue(
        comLean([
          { usuarioId: ANA_ID, status: 'aprovado', criadoEm: d1 },
          { usuarioId: BRUNO_ID, status: 'inscrito', criadoEm: d3 },
          { usuarioId: REMOVIDO_ID, status: 'inscrito', criadoEm: d2 },
          { usuarioId: 'legado', status: 'em_analise', criadoEm: d2 },
          { usuarioId: ANA_ID, status: 'inscrito', criadoEm: d3 },
        ]),
      );
      usuarioModel.find.mockReturnValue(
        comLean([
          { _id: ANA_ID, nome: 'Ana' },
          { _id: BRUNO_ID, nome: 'Bruno' },
        ]),
      );

      const relatorio = await service.porVaga(VAGA_ID, '30d', AGORA);

      const filtro = { vagaId: VAGA_ID, criadoEm: { $gte: INICIO_30D } };
      expect(candidaturaModel.aggregate).toHaveBeenCalledWith(expect.arrayContaining([{ $match: filtro }]));
      expect(candidaturaModel.find).toHaveBeenCalledWith(filtro, 'usuarioId status criadoEm');
      expect(usuarioModel.find).toHaveBeenCalledWith({ _id: { $in: [ANA_ID, BRUNO_ID, REMOVIDO_ID] } }, 'nome');
      expect(relatorio.vaga).toEqual({ id: VAGA_ID, titulo: 'Dev', area: 'back', status: 'ativa', criadoEm });
      expect(relatorio.candidaturas).toMatchObject({ total: 4, taxaAprovacao: 1 });
      expect(relatorio.candidatos).toEqual([
        { nome: null, status: 'inscrito', inscritoEm: d2 },
        { nome: 'Bruno', status: 'inscrito', inscritoEm: d3 },
        { nome: 'Ana', status: 'inscrito', inscritoEm: d3 },
        { nome: null, status: 'em_analise', inscritoEm: d2 },
        { nome: 'Ana', status: 'aprovado', inscritoEm: d1 },
      ]);
      expect(relatorio.serie.granularidade).toBe('semana');
    });

    it('sem recorte de período filtra só pela vaga e devolve criadoEm nulo quando a vaga não tem data', async () => {
      const { service, candidaturaModel, vagaModel } = montar();
      vagaModel.findById.mockReturnValue(comLean({ _id: VAGA_ID, titulo: 'Dev', area: 'back', status: 'pausada' }));

      const relatorio = await service.porVaga(VAGA_ID, 'tudo');

      expect(candidaturaModel.find).toHaveBeenCalledWith({ vagaId: VAGA_ID }, 'usuarioId status criadoEm');
      expect(relatorio).toMatchObject({
        geradoEm: AGORA.toISOString(),
        vaga: { criadoEm: null },
        candidatos: [],
        serie: { granularidade: 'mes', pontos: [] },
      });
    });
  });
});

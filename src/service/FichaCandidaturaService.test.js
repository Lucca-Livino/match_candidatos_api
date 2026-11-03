import FichaCandidaturaService from './FichaCandidaturaService.js';
import Usuario from '../models/Usuario.js';
import Vaga from '../models/Vaga.js';
import Habilidade from '../models/Habilidade.js';
import Formacao from '../models/Formacao.js';
import Experiencia from '../models/Experiencia.js';
import Certificacao from '../models/Certificacao.js';
import AppError from '../utils/helpers/AppError.js';

jest.mock('../models/Usuario.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../models/Vaga.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../models/Habilidade.js', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('../models/Formacao.js', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('../models/Experiencia.js', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('../models/Certificacao.js', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('../repository/CandidaturaRepository.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ repositorioPadrao: 'candidatura' })),
}));
jest.mock('./AvaliacaoPayloadService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ servicoPadrao: 'payload' })),
}));

const USUARIO_ID = '64b7f0c2a1b2c3d4e5f60721';
const VAGA_ID = '64b7f0c2a1b2c3d4e5f60718';
const CRIADO_EM = new Date('2026-10-01T00:00:00.000Z');

const comLean = (valor) => ({ lean: jest.fn().mockResolvedValue(valor) });
const comLeanRejeitado = () => ({ lean: jest.fn().mockRejectedValue(new Error('CastError')) });
const ordenado = (valor) => ({ sort: jest.fn().mockReturnValue(comLean(valor)) });

const curriculoVazio = { habilidades: [], formacoes: [], experiencias: [], certificacoes: [] };

const definirCurriculo = ({ habilidades = [], formacoes = [], experiencias = [], certificacoes = [] } = {}) => {
  Habilidade.find.mockReturnValue(comLean(habilidades));
  Formacao.find.mockReturnValue(ordenado(formacoes));
  Experiencia.find.mockReturnValue(ordenado(experiencias));
  Certificacao.find.mockReturnValue(ordenado(certificacoes));
};

const montar = () => {
  const candidaturaRepository = {
    buscarPorUsuarioEVaga: jest.fn().mockResolvedValue({ status: 'em_analise', criadoEm: CRIADO_EM, scoreIA: 90 }),
  };
  const avaliacaoPayloadService = {
    montarQuestionario: jest.fn().mockResolvedValue({ titulo: 'Triagem', respostas: [] }),
  };
  const service = new FichaCandidaturaService(candidaturaRepository, avaliacaoPayloadService);
  return { service, candidaturaRepository, avaliacaoPayloadService };
};

const NAO_ENCONTRADA = { constructor: AppError, message: 'Candidatura não encontrada.', statusCode: 404, code: 'NOT_FOUND' };

beforeEach(() => {
  jest.clearAllMocks();
  definirCurriculo();
  Usuario.findById.mockReturnValue(
    comLean({ _id: USUARIO_ID, nome: 'Ana', email: 'ana@x.com', telefone: '11999', linkedin: 'in/ana', cidade: 'SP' }),
  );
  Vaga.findById.mockReturnValue(comLean({ _id: VAGA_ID, titulo: 'Dev', area: 'back', gabarito: 'x' }));
});

describe('FichaCandidaturaService', () => {
  describe('construtor', () => {
    it('usa repositório e serviço de payload padrão quando nada é injetado', () => {
      const service = new FichaCandidaturaService();

      expect(service.candidaturaRepository).toEqual({ repositorioPadrao: 'candidatura' });
      expect(service.avaliacaoPayloadService).toEqual({ servicoPadrao: 'payload' });
    });
  });

  describe('montar', () => {
    it('lança 404 sem candidatura e não consulta o currículo', async () => {
      const { service, candidaturaRepository } = montar();
      candidaturaRepository.buscarPorUsuarioEVaga.mockResolvedValue(null);

      await expect(service.montar(USUARIO_ID, VAGA_ID)).rejects.toMatchObject(NAO_ENCONTRADA);
      expect(candidaturaRepository.buscarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(Usuario.findById).not.toHaveBeenCalled();
    });

    it.each([
      ['o usuário não existe', () => Usuario.findById.mockReturnValue(comLean(null))],
      ['a vaga não existe', () => Vaga.findById.mockReturnValue(comLean(null))],
      ['a busca do usuário falha', () => Usuario.findById.mockReturnValue(comLeanRejeitado())],
      ['a busca da vaga falha', () => Vaga.findById.mockReturnValue(comLeanRejeitado())],
    ])('lança 404 quando %s', async (_caso, preparar) => {
      const { service } = montar();
      preparar();

      await expect(service.montar(USUARIO_ID, VAGA_ID)).rejects.toMatchObject(NAO_ENCONTRADA);
    });

    it('monta a ficha campo a campo sem dados da triagem', async () => {
      const { service, avaliacaoPayloadService } = montar();
      avaliacaoPayloadService.montarQuestionario.mockResolvedValue({
        titulo: 'Triagem',
        respostas: [
          {
            perguntaId: 'p1',
            enunciado: 'Por quê?',
            tipoResposta: 'texto',
            textoResposta: 'Porque sim',
            opcoesSelecionadas: [],
            gabarito: 'segredo',
            pontuacao: 10,
          },
        ],
      });

      const ficha = await service.montar(USUARIO_ID, VAGA_ID);

      expect(Usuario.findById).toHaveBeenCalledWith(USUARIO_ID, 'nome email telefone linkedin cidade');
      expect(Vaga.findById).toHaveBeenCalledWith(VAGA_ID, 'titulo area');
      expect(avaliacaoPayloadService.montarQuestionario).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(ficha).toEqual({
        candidato: { id: USUARIO_ID, nome: 'Ana', email: 'ana@x.com', telefone: '11999', linkedin: 'in/ana', cidade: 'SP' },
        vaga: { id: VAGA_ID, titulo: 'Dev', area: 'back' },
        candidatura: { status: 'em_analise', criadoEm: CRIADO_EM },
        curriculo: curriculoVazio,
        questionario: {
          titulo: 'Triagem',
          respostas: [
            { perguntaId: 'p1', enunciado: 'Por quê?', tipoResposta: 'texto', textoResposta: 'Porque sim', opcoesSelecionadas: [] },
          ],
        },
      });
    });

    it('preenche contato ausente com texto vazio e data da candidatura com nulo', async () => {
      const { service, candidaturaRepository } = montar();
      candidaturaRepository.buscarPorUsuarioEVaga.mockResolvedValue({ status: 'inscrito' });
      Usuario.findById.mockReturnValue(comLean({ _id: USUARIO_ID, nome: 'Ana', email: 'ana@x.com' }));

      const ficha = await service.montar(USUARIO_ID, VAGA_ID);

      expect(ficha.candidato).toMatchObject({ telefone: '', linkedin: '', cidade: '' });
      expect(ficha.candidatura).toEqual({ status: 'inscrito', criadoEm: null });
    });
  });

  describe('montarCurriculo', () => {
    it('ordena por data decrescente e mapeia só os campos da ficha', async () => {
      const { service } = montar();
      const inicio = new Date('2024-01-01T00:00:00.000Z');
      const fim = new Date('2025-01-01T00:00:00.000Z');
      definirCurriculo({
        habilidades: [{ id: 'h1', habilidade: 'Node', nivel: 'avancado', usuarioId: USUARIO_ID }],
        formacoes: [
          { id: 'f1', instituicao: 'USP', curso: 'BCC', grau: 'bacharelado', situacao: 'concluido', anoInicio: 2018, anoConclusao: 2022 },
        ],
        experiencias: [
          { id: 'e1', empresa: 'Acme', cargo: 'Dev', descricaoAtivida_: 'APIs', dataInicio: inicio, dataFim: fim },
        ],
        certificacoes: [
          { id: 'c1', nome: 'AWS', emissor: 'Amazon', dataEmissao: inicio, dataExpiracao: fim, codigo: 'ABC' },
        ],
      });

      const curriculo = await service.montarCurriculo(USUARIO_ID);

      expect(Habilidade.find).toHaveBeenCalledWith({ usuarioId: USUARIO_ID });
      expect(Formacao.find.mock.results[0].value.sort).toHaveBeenCalledWith({ anoInicio: -1 });
      expect(Experiencia.find.mock.results[0].value.sort).toHaveBeenCalledWith({ dataInicio: -1 });
      expect(Certificacao.find.mock.results[0].value.sort).toHaveBeenCalledWith({ dataEmissao: -1 });
      expect(curriculo).toEqual({
        habilidades: [{ id: 'h1', habilidade: 'Node', nivel: 'avancado' }],
        formacoes: [
          { id: 'f1', instituicao: 'USP', curso: 'BCC', grau: 'bacharelado', situacao: 'concluido', anoInicio: 2018, anoConclusao: 2022 },
        ],
        experiencias: [{ id: 'e1', empresa: 'Acme', cargo: 'Dev', descricaoAtivida_: 'APIs', dataInicio: inicio, dataFim: fim }],
        certificacoes: [{ id: 'c1', nome: 'AWS', emissor: 'Amazon', dataEmissao: inicio, dataExpiracao: fim, codigo: 'ABC' }],
      });
    });

    it('usa nulo e texto vazio para os campos opcionais ausentes', async () => {
      const { service } = montar();
      const inicio = new Date('2024-01-01T00:00:00.000Z');
      definirCurriculo({
        formacoes: [{ id: 'f1', instituicao: 'USP', curso: 'BCC', grau: 'bacharelado', situacao: 'cursando', anoInicio: 2023 }],
        experiencias: [{ id: 'e1', empresa: 'Acme', cargo: 'Dev', descricaoAtivida_: 'APIs', dataInicio: inicio }],
        certificacoes: [{ id: 'c1', nome: 'AWS', emissor: 'Amazon' }],
      });

      const curriculo = await service.montarCurriculo(USUARIO_ID);

      expect(curriculo.formacoes[0].anoConclusao).toBeNull();
      expect(curriculo.experiencias[0].dataFim).toBeNull();
      expect(curriculo.certificacoes[0]).toMatchObject({ dataEmissao: null, dataExpiracao: null, codigo: '' });
    });
  });
});

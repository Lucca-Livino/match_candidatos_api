import ExperienciaService from '../../../service/ExperienciaService.js';
import ExperienciaRepository from '../../../repository/ExperienciaRepository.js';
import CatalogoService from '../../../service/CatalogoService.js';

jest.mock('../../../repository/ExperienciaRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../service/CatalogoService.js', () => ({ __esModule: true, default: jest.fn() }));

const USUARIO_ID = 'usuario-1';
const EXPERIENCIA_ID = 'experiencia-1';
const AGORA = new Date(2026, 10, 3, 12).getTime();

const dia = (ano, mes, d) => new Date(ano, mes - 1, d, 12);

const existente = {
  id: EXPERIENCIA_ID,
  usuarioId: USUARIO_ID,
  cargo: 'Dev',
  dataInicio: dia(2024, 1, 10),
  dataFim: dia(2025, 1, 10),
  mesesDuracao: 12,
  __v: 0,
};

const naoEncontrada = { message: 'Experiência não encontrada.', statusCode: 404, code: 'NOT_FOUND' };
const fimAnterior = {
  message: 'dataFim não pode ser anterior a dataInicio.',
  statusCode: 400,
  code: 'VALIDATION_ERROR',
};

const montarService = () => {
  const repository = {
    criar: jest.fn(async (dados) => ({ toObject: () => ({ id: EXPERIENCIA_ID, ...dados, __v: 0 }) })),
    listarPorUsuarioId: jest.fn().mockResolvedValue([]),
    buscarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
    atualizarPorUsuarioEId: jest.fn(async (usuarioId, id, dados) => ({ ...existente, ...dados })),
    deletarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
  };
  const catalogoService = { garantirReferencias: jest.fn().mockResolvedValue(undefined) };
  return { service: new ExperienciaService(repository, catalogoService), repository, catalogoService };
};

describe('ExperienciaService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AGORA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('instancia repositório e catálogo padrão quando não injetados', () => {
    const service = new ExperienciaService();

    expect(service.experienciaRepository).toBeInstanceOf(ExperienciaRepository);
    expect(service.catalogoService).toBeInstanceOf(CatalogoService);
  });

  describe('sanitize', () => {
    it('devolve null para documento ausente', () => {
      expect(montarService().service.sanitize(null)).toBeNull();
    });

    it('remove __v', () => {
      expect(montarService().service.sanitize({ id: 'e1', __v: 1 })).toEqual({ id: 'e1' });
    });
  });

  describe('calcularMesesDuracao', () => {
    it.each([
      ['mesmo dia', dia(2024, 1, 10), dia(2024, 1, 10), 0],
      ['um mês exato', dia(2024, 1, 10), dia(2024, 2, 10), 1],
      ['um dia antes de completar o mês', dia(2024, 1, 10), dia(2024, 2, 9), 0],
      ['virada de ano', dia(2023, 11, 15), dia(2024, 2, 15), 3],
      ['dia final menor que o inicial', dia(2023, 1, 31), dia(2024, 3, 1), 13],
      ['dois anos completos', dia(2022, 5, 1), dia(2024, 5, 1), 24],
    ])('calcula %s', (_, inicio, fim, meses) => {
      expect(montarService().service.calcularMesesDuracao(inicio, fim)).toBe(meses);
    });

    it.each([
      ['ausente', undefined],
      ['nula', null],
    ])('usa a data atual quando dataFim está %s', (_, dataFim) => {
      expect(montarService().service.calcularMesesDuracao(dia(2025, 11, 3), dataFim)).toBe(12);
    });

    it('rejeita dataFim anterior a dataInicio', () => {
      expect(() => montarService().service.calcularMesesDuracao(dia(2024, 2, 1), dia(2024, 1, 31))).toThrow(
        expect.objectContaining(fimAnterior),
      );
    });

    it('rejeita dataInicio no futuro sem dataFim', () => {
      expect(() => montarService().service.calcularMesesDuracao(dia(2026, 12, 1), null)).toThrow(
        expect.objectContaining(fimAnterior),
      );
    });
  });

  describe('criarExperiencia', () => {
    it('valida a área, calcula a duração e grava vinculada ao usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      const payload = { cargo: 'Dev', areaId: 'area-1', dataInicio: dia(2024, 1, 10), dataFim: dia(2024, 7, 10) };

      const resultado = await service.criarExperiencia(USUARIO_ID, payload);

      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'area_atuacao', id: 'area-1', campo: 'areaId' },
      ]);
      expect(repository.criar).toHaveBeenCalledWith({ ...payload, usuarioId: USUARIO_ID, mesesDuracao: 6 });
      expect(resultado).toEqual({ id: EXPERIENCIA_ID, ...payload, usuarioId: USUARIO_ID, mesesDuracao: 6 });
    });

    it('não grava quando a área não pertence ao catálogo', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.criarExperiencia(USUARIO_ID, { dataInicio: dia(2024, 1, 1) })).rejects.toThrow('catálogo');
      expect(repository.criar).not.toHaveBeenCalled();
    });

    it('não grava quando dataFim é anterior a dataInicio', async () => {
      const { service, repository } = montarService();
      const payload = { dataInicio: dia(2024, 5, 1), dataFim: dia(2024, 4, 1) };

      await expect(service.criarExperiencia(USUARIO_ID, payload)).rejects.toMatchObject(fimAnterior);
      expect(repository.criar).not.toHaveBeenCalled();
    });
  });

  describe('listarExperiencia', () => {
    it('lista apenas as experiências do usuário, sanitizadas', async () => {
      const { service, repository } = montarService();
      repository.listarPorUsuarioId.mockResolvedValue([{ id: 'e1', __v: 0 }, { id: 'e2', __v: 3 }]);

      const resultado = await service.listarExperiencia(USUARIO_ID);

      expect(repository.listarPorUsuarioId).toHaveBeenCalledWith(USUARIO_ID);
      expect(resultado).toEqual([{ id: 'e1' }, { id: 'e2' }]);
    });
  });

  describe('atualizarExperiencia', () => {
    it('responde 404 quando a experiência não é do usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      repository.buscarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.atualizarExperiencia('outro', EXPERIENCIA_ID, {})).rejects.toMatchObject(naoEncontrada);
      expect(repository.buscarPorUsuarioEId).toHaveBeenCalledWith('outro', EXPERIENCIA_ID);
      expect(catalogoService.garantirReferencias).not.toHaveBeenCalled();
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it('não atualiza quando a área não pertence ao catálogo', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.atualizarExperiencia(USUARIO_ID, EXPERIENCIA_ID, { areaId: 'x' })).rejects.toThrow('catálogo');
      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'area_atuacao', id: 'x', campo: 'areaId' },
      ]);
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it.each([
      ['mantém as datas existentes', { cargo: 'Tech Lead' }, 12],
      ['combina dataInicio nova com dataFim existente', { dataInicio: dia(2024, 7, 10) }, 6],
      ['combina dataFim nova com dataInicio existente', { dataFim: dia(2024, 4, 10) }, 3],
      ['usa a data atual quando dataFim é removida', { dataFim: null }, 33],
      ['usa as duas datas do payload', { dataInicio: dia(2025, 1, 1), dataFim: dia(2025, 3, 1) }, 2],
    ])('%s ao recalcular a duração', async (_, payload, mesesDuracao) => {
      const { service, repository } = montarService();

      const resultado = await service.atualizarExperiencia(USUARIO_ID, EXPERIENCIA_ID, payload);

      expect(repository.atualizarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, EXPERIENCIA_ID, {
        ...payload,
        mesesDuracao,
      });
      expect(resultado).toEqual({ ...existente, ...payload, mesesDuracao, __v: undefined });
      expect(resultado).not.toHaveProperty('__v');
    });

    it.each([
      ['dataInicio nova posterior à dataFim existente', { dataInicio: dia(2025, 2, 1) }],
      ['dataFim nova anterior à dataInicio existente', { dataFim: dia(2023, 12, 31) }],
    ])('rejeita %s', async (_, payload) => {
      const { service, repository } = montarService();

      await expect(service.atualizarExperiencia(USUARIO_ID, EXPERIENCIA_ID, payload)).rejects.toMatchObject(fimAnterior);
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });
  });

  describe('deletarExperiencia', () => {
    it('remove a experiência do usuário', async () => {
      const { service, repository } = montarService();

      await expect(service.deletarExperiencia(USUARIO_ID, EXPERIENCIA_ID)).resolves.toEqual({
        id: EXPERIENCIA_ID,
        deletado: true,
      });
      expect(repository.deletarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, EXPERIENCIA_ID);
    });

    it('responde 404 quando a experiência não é do usuário', async () => {
      const { service, repository } = montarService();
      repository.deletarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.deletarExperiencia('outro', EXPERIENCIA_ID)).rejects.toMatchObject(naoEncontrada);
    });
  });
});

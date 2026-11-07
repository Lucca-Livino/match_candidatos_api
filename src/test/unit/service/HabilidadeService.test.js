import HabilidadeService from '../../../service/HabilidadeService.js';
import HabilidadeRepository from '../../../repository/HabilidadeRepository.js';
import CatalogoService from '../../../service/CatalogoService.js';

jest.mock('../../../repository/HabilidadeRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../service/CatalogoService.js', () => ({ __esModule: true, default: jest.fn() }));

const USUARIO_ID = 'usuario-1';
const HABILIDADE_ID = 'habilidade-1';

const existente = { id: HABILIDADE_ID, usuarioId: USUARIO_ID, habilidade: 'Node', itemId: 'item-node', nivel: 'avancado', __v: 0 };

const naoEncontrada = { message: 'Habilidade não encontrada.', statusCode: 404, code: 'NOT_FOUND' };

const montarService = () => {
  const repository = {
    criar: jest.fn(async (dados) => ({ toObject: () => ({ id: HABILIDADE_ID, ...dados, __v: 0 }) })),
    listarPorUsuarioId: jest.fn().mockResolvedValue([]),
    buscarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
    atualizarPorUsuarioEId: jest.fn(async (usuarioId, id, dados) => ({ ...existente, ...dados })),
    deletarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
  };
  const catalogoService = { garantirReferencias: jest.fn().mockResolvedValue(undefined) };
  return { service: new HabilidadeService(repository, catalogoService), repository, catalogoService };
};

describe('HabilidadeService', () => {
  it('instancia repositório e catálogo padrão quando não injetados', () => {
    const service = new HabilidadeService();

    expect(service.habilidadeRepository).toBeInstanceOf(HabilidadeRepository);
    expect(service.catalogoService).toBeInstanceOf(CatalogoService);
  });

  describe('sanitize', () => {
    it('devolve null para documento ausente', () => {
      expect(montarService().service.sanitize(null)).toBeNull();
    });

    it('remove __v', () => {
      expect(montarService().service.sanitize({ id: 'h1', __v: 1 })).toEqual({ id: 'h1' });
    });
  });

  describe('criarHabilidade', () => {
    it('valida o item no catálogo e grava vinculada ao usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      const payload = { habilidade: 'Node', itemId: 'item-node', nivel: 'avancado' };

      const resultado = await service.criarHabilidade(USUARIO_ID, payload);

      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'habilidade', id: 'item-node', campo: 'itemId' },
      ]);
      expect(repository.criar).toHaveBeenCalledWith({ ...payload, usuarioId: USUARIO_ID });
      expect(resultado).toEqual({ id: HABILIDADE_ID, ...payload, usuarioId: USUARIO_ID });
    });

    it('não grava quando o item não pertence ao catálogo de habilidades', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.criarHabilidade(USUARIO_ID, { itemId: 'x' })).rejects.toThrow('catálogo');
      expect(repository.criar).not.toHaveBeenCalled();
    });
  });

  describe('listarHabilidade', () => {
    it('lista apenas as habilidades do usuário, sanitizadas', async () => {
      const { service, repository } = montarService();
      repository.listarPorUsuarioId.mockResolvedValue([{ id: 'h1', __v: 0 }, { id: 'h2', __v: 2 }]);

      const resultado = await service.listarHabilidade(USUARIO_ID);

      expect(repository.listarPorUsuarioId).toHaveBeenCalledWith(USUARIO_ID);
      expect(resultado).toEqual([{ id: 'h1' }, { id: 'h2' }]);
    });
  });

  describe('atualizarHabilidade', () => {
    it('responde 404 quando a habilidade não é do usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      repository.buscarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.atualizarHabilidade('outro', HABILIDADE_ID, {})).rejects.toMatchObject(naoEncontrada);
      expect(repository.buscarPorUsuarioEId).toHaveBeenCalledWith('outro', HABILIDADE_ID);
      expect(catalogoService.garantirReferencias).not.toHaveBeenCalled();
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it('não atualiza quando o item não pertence ao catálogo de habilidades', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.atualizarHabilidade(USUARIO_ID, HABILIDADE_ID, { itemId: 'x' })).rejects.toThrow('catálogo');
      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'habilidade', id: 'x', campo: 'itemId' },
      ]);
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it.each([
      ['desvincula o item quando o texto muda sem itemId', { habilidade: 'Deno' }, { habilidade: 'Deno', itemId: null }],
      ['mantém o itemId informado junto do texto', { habilidade: 'Deno', itemId: 'item-deno' }, { habilidade: 'Deno', itemId: 'item-deno' }],
      ['aceita desvínculo explícito', { habilidade: 'Deno', itemId: null }, { habilidade: 'Deno', itemId: null }],
      ['preserva o vínculo quando o texto não muda', { nivel: 'basico' }, { nivel: 'basico' }],
    ])('%s', async (_, payload, gravado) => {
      const { service, repository } = montarService();

      const resultado = await service.atualizarHabilidade(USUARIO_ID, HABILIDADE_ID, payload);

      expect(repository.atualizarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, HABILIDADE_ID, gravado);
      expect(resultado).toEqual({ ...existente, ...gravado, __v: undefined });
      expect(resultado).not.toHaveProperty('__v');
    });

    it('não altera o payload recebido ao desvincular o item', async () => {
      const { service } = montarService();
      const payload = { habilidade: 'Deno' };

      await service.atualizarHabilidade(USUARIO_ID, HABILIDADE_ID, payload);

      expect(payload).toEqual({ habilidade: 'Deno' });
    });
  });

  describe('deletarHabilidade', () => {
    it('remove a habilidade do usuário', async () => {
      const { service, repository } = montarService();

      await expect(service.deletarHabilidade(USUARIO_ID, HABILIDADE_ID)).resolves.toEqual({
        id: HABILIDADE_ID,
        deletado: true,
      });
      expect(repository.deletarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, HABILIDADE_ID);
    });

    it('responde 404 quando a habilidade não é do usuário', async () => {
      const { service, repository } = montarService();
      repository.deletarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.deletarHabilidade('outro', HABILIDADE_ID)).rejects.toMatchObject(naoEncontrada);
    });
  });
});

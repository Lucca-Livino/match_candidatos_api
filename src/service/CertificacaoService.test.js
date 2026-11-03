import CertificacaoService from './CertificacaoService.js';
import CertificacaoRepository from '../repository/CertificacaoRepository.js';
import CatalogoService from './CatalogoService.js';

jest.mock('../repository/CertificacaoRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./CatalogoService.js', () => ({ __esModule: true, default: jest.fn() }));

const USUARIO_ID = 'usuario-1';
const CERTIFICACAO_ID = 'certificacao-1';
const AGORA = Date.parse('2026-11-03T12:00:00Z');

const existente = {
  id: CERTIFICACAO_ID,
  usuarioId: USUARIO_ID,
  nome: 'AWS Cloud Practitioner',
  itemId: 'item-aws',
  dataExpiracao: new Date('2027-01-01T00:00:00Z'),
  __v: 0,
};

const naoEncontrada = { message: 'Certificação não encontrada.', statusCode: 404, code: 'NOT_FOUND' };

const montarService = () => {
  const repository = {
    criar: jest.fn(async (dados) => ({ toObject: () => ({ id: CERTIFICACAO_ID, ...dados, __v: 0 }) })),
    listarPorUsuarioId: jest.fn().mockResolvedValue([]),
    buscarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
    atualizarPorUsuarioEId: jest.fn(async (usuarioId, id, dados) => ({ ...existente, ...dados })),
    deletarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
  };
  const catalogoService = { garantirReferencias: jest.fn().mockResolvedValue(undefined) };
  return { service: new CertificacaoService(repository, catalogoService), repository, catalogoService };
};

describe('CertificacaoService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AGORA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('instancia repositório e catálogo padrão quando não injetados', () => {
    const service = new CertificacaoService();

    expect(service.certificacaoRepository).toBeInstanceOf(CertificacaoRepository);
    expect(service.catalogoService).toBeInstanceOf(CatalogoService);
  });

  describe('sanitize', () => {
    it('devolve null para documento ausente', () => {
      expect(montarService().service.sanitize(null)).toBeNull();
    });

    it('remove __v', () => {
      expect(montarService().service.sanitize({ id: 'c1', __v: 1 })).toEqual({ id: 'c1' });
    });
  });

  describe('withCertificacaoExpirada', () => {
    it.each([
      ['sem data de expiração', undefined, false],
      ['com data de expiração nula', null, false],
      ['com expiração futura', '2026-11-03T12:00:01Z', false],
      ['expirando exatamente agora', '2026-11-03T12:00:00Z', false],
      ['com expiração passada', '2026-11-03T11:59:59Z', true],
      ['com expiração passada em Date', new Date('2020-01-01T00:00:00Z'), true],
    ])('marca certificação %s', (_, dataExpiracao, expirada) => {
      const resultado = montarService().service.withCertificacaoExpirada({ id: 'c1', dataExpiracao, __v: 0 });

      expect(resultado).toEqual({ id: 'c1', dataExpiracao, expirada });
    });
  });

  describe('criarCertificacao', () => {
    it('valida o item no catálogo, grava vinculada ao usuário e indica expiração', async () => {
      const { service, repository, catalogoService } = montarService();
      const payload = { nome: 'AWS', itemId: 'item-aws', dataExpiracao: '2025-01-01T00:00:00Z' };

      const resultado = await service.criarCertificacao(USUARIO_ID, payload);

      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'certificacao', id: 'item-aws', campo: 'itemId' },
      ]);
      expect(repository.criar).toHaveBeenCalledWith({ ...payload, usuarioId: USUARIO_ID });
      expect(resultado).toEqual({ id: CERTIFICACAO_ID, ...payload, usuarioId: USUARIO_ID, expirada: true });
    });

    it('não grava quando o item não pertence ao catálogo de certificações', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.criarCertificacao(USUARIO_ID, { itemId: 'x' })).rejects.toThrow('catálogo');
      expect(repository.criar).not.toHaveBeenCalled();
    });
  });

  describe('listarCertificacao', () => {
    it('lista apenas as certificações do usuário com o indicador de expiração', async () => {
      const { service, repository } = montarService();
      repository.listarPorUsuarioId.mockResolvedValue([
        { id: 'c1', dataExpiracao: '2020-01-01T00:00:00Z', __v: 0 },
        { id: 'c2', __v: 0 },
      ]);

      const resultado = await service.listarCertificacao(USUARIO_ID);

      expect(repository.listarPorUsuarioId).toHaveBeenCalledWith(USUARIO_ID);
      expect(resultado).toEqual([
        { id: 'c1', dataExpiracao: '2020-01-01T00:00:00Z', expirada: true },
        { id: 'c2', expirada: false },
      ]);
    });
  });

  describe('atualizarCertificacao', () => {
    it('responde 404 quando a certificação não é do usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      repository.buscarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.atualizarCertificacao('outro', CERTIFICACAO_ID, {})).rejects.toMatchObject(naoEncontrada);
      expect(repository.buscarPorUsuarioEId).toHaveBeenCalledWith('outro', CERTIFICACAO_ID);
      expect(catalogoService.garantirReferencias).not.toHaveBeenCalled();
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it('não atualiza quando o item não pertence ao catálogo de certificações', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.atualizarCertificacao(USUARIO_ID, CERTIFICACAO_ID, { itemId: 'x' })).rejects.toThrow('catálogo');
      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'certificacao', id: 'x', campo: 'itemId' },
      ]);
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it.each([
      ['desvincula o item quando o nome muda sem itemId', { nome: 'Azure' }, { nome: 'Azure', itemId: null }],
      ['mantém o itemId informado junto do nome', { nome: 'Azure', itemId: 'item-az' }, { nome: 'Azure', itemId: 'item-az' }],
      ['aceita desvínculo explícito', { nome: 'Azure', itemId: null }, { nome: 'Azure', itemId: null }],
      ['preserva o vínculo quando o nome não muda', { emissor: 'AWS' }, { emissor: 'AWS' }],
    ])('%s', async (_, payload, gravado) => {
      const { service, repository } = montarService();

      const resultado = await service.atualizarCertificacao(USUARIO_ID, CERTIFICACAO_ID, payload);

      expect(repository.atualizarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, CERTIFICACAO_ID, gravado);
      expect(resultado).toEqual({ ...existente, ...gravado, __v: undefined, expirada: false });
      expect(resultado).not.toHaveProperty('__v');
    });

    it('recalcula a expiração com a nova data', async () => {
      const { service } = montarService();

      const resultado = await service.atualizarCertificacao(USUARIO_ID, CERTIFICACAO_ID, {
        dataExpiracao: '2026-01-01T00:00:00Z',
      });

      expect(resultado.expirada).toBe(true);
    });

    it('não altera o payload recebido ao desvincular o item', async () => {
      const { service } = montarService();
      const payload = { nome: 'Azure' };

      await service.atualizarCertificacao(USUARIO_ID, CERTIFICACAO_ID, payload);

      expect(payload).toEqual({ nome: 'Azure' });
    });
  });

  describe('deletarCertificacao', () => {
    it('remove a certificação do usuário', async () => {
      const { service, repository } = montarService();

      await expect(service.deletarCertificacao(USUARIO_ID, CERTIFICACAO_ID)).resolves.toEqual({
        id: CERTIFICACAO_ID,
        deletado: true,
      });
      expect(repository.deletarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, CERTIFICACAO_ID);
    });

    it('responde 404 quando a certificação não é do usuário', async () => {
      const { service, repository } = montarService();
      repository.deletarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.deletarCertificacao('outro', CERTIFICACAO_ID)).rejects.toMatchObject(naoEncontrada);
    });
  });
});

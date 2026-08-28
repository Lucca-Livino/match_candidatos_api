import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import CandidaturaService from '../../service/CandidaturaService.js';
import Candidatura from '../../models/Candidatura.js';

describe('CandidaturaService.listarPorVaga — sem ranking', () => {
  const service = new CandidaturaService();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  // `timestamps: false` e obrigatorio: com timestamps ligados o Mongoose
  // sobrescreve criadoEm com a hora atual e as duas insercoes empatam,
  // tornando a assercao de ordem instavel.
  const semear = async () => {
    await Candidatura.create(
      [
        {
          usuarioId: 'u-baixo',
          vagaId: 'v1',
          scoreIA: 0.31,
          compativel: 0,
          criadoEm: new Date('2026-01-01T10:00:00Z'),
          avaliadoEm: new Date(),
        },
        {
          usuarioId: 'u-alto',
          vagaId: 'v1',
          scoreIA: 0.95,
          compativel: 1,
          criadoEm: new Date('2026-01-02T10:00:00Z'),
          avaliadoEm: new Date(),
        },
      ],
      { timestamps: false },
    );
  };

  it('nunca expoe o score bruto', async () => {
    await semear();
    const lista = await service.listarPorVaga('v1');
    for (const item of lista) {
      expect(item.scoreIA).toBeUndefined();
      expect(item.limiteAplicado).toBeUndefined();
    }
  });

  it('ordena por criadoEm crescente, nao por score', async () => {
    await semear();
    const lista = await service.listarPorVaga('v1');
    expect(lista.map((c) => c.usuarioId)).toEqual(['u-baixo', 'u-alto']);
  });

  // Requisito revisto em 2026-08-28: o recrutador nao ve NADA da triagem. O
  // resultado chega a ele como fila (compativel entra em 'em_analise'), e os
  // campos da IA ficam so para o suporte, em /avaliacoes.
  it('nao expoe nenhum campo da triagem', async () => {
    await semear();
    for (const item of await service.listarPorVaga('v1')) {
      expect(item.compativel).toBeUndefined();
      expect(item.justificativa).toBeUndefined();
      expect(item.motivoIncompat_).toBeUndefined();
      expect(item.avaliadoEm).toBeUndefined();
      expect(item.versaoModelo).toBeUndefined();
    }
  });

  it('nao expoe a triagem no detalhe da candidatura', async () => {
    // Omitir na listagem e devolver no detalhe deixaria a omissao decorativa.
    await semear();
    const detalhe = await service.detalharCandidatura('u-alto', 'v1');
    expect(detalhe.scoreIA).toBeUndefined();
    expect(detalhe.compativel).toBeUndefined();
    expect(detalhe.justificativa).toBeUndefined();
  });
});

describe('CandidaturaService.reavaliarCandidatura', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const montarService = (avaliacaoService) =>
    new CandidaturaService(undefined, avaliacaoService);

  it('reavalia uma candidatura pendente e devolve o resultado sem score', async () => {
    await Candidatura.create({ usuarioId: 'u1', vagaId: 'v1' });
    const avaliacaoService = {
      avaliar: jest.fn().mockResolvedValue({
        usuarioId: 'u1',
        vagaId: 'v1',
        compativel: 1,
        scoreIA: 0.88,
        limiteAplicado: 0.7,
        justificativa: 'Perfil aderente.',
        avaliadoEm: new Date(),
      }),
    };

    const resultado = await montarService(avaliacaoService).reavaliarCandidatura('u1', 'v1');

    expect(avaliacaoService.avaliar).toHaveBeenCalledWith('u1', 'v1');
    expect(resultado.usuarioId).toBe('u1');
    expect(resultado.compativel).toBeUndefined();
    expect(resultado.scoreIA).toBeUndefined();
    expect(resultado.limiteAplicado).toBeUndefined();
  });

  it('devolve 404 quando a candidatura nao existe', async () => {
    const avaliacaoService = { avaliar: jest.fn() };

    await expect(
      montarService(avaliacaoService).reavaliarCandidatura('fantasma', 'v1'),
    ).rejects.toThrow('Candidatura nao encontrada.');
    expect(avaliacaoService.avaliar).not.toHaveBeenCalled();
  });

  it('devolve 503 quando a avaliacao nao acontece', async () => {
    // `avaliar` devolve null tanto no kill switch quanto na falha da IA. O
    // recrutador precisa saber que nada mudou — devolver 200 com o documento
    // antigo faria a reavaliacao parecer bem-sucedida.
    await Candidatura.create({ usuarioId: 'u2', vagaId: 'v2' });
    const avaliacaoService = { avaliar: jest.fn().mockResolvedValue(null) };

    await expect(
      montarService(avaliacaoService).reavaliarCandidatura('u2', 'v2'),
    ).rejects.toThrow('Avaliacao por IA indisponivel.');
  });
});

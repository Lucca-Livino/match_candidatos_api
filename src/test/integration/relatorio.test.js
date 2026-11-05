import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import RelatorioService from '../../service/RelatorioService.js';
import Candidatura from '../../models/Candidatura.js';
import Vaga from '../../models/Vaga.js';
import Usuario from '../../models/Usuario.js';

const AGORA = new Date('2026-09-30T12:00:00Z');
const service = new RelatorioService();


async function semearVagas() {
  const [v1, v2, v3] = await Vaga.create(
    [
      { area: 'TI', titulo: 'Dev Front', descricao: 'Vaga de front-end para teste.', status: 'ativa', createdAt: new Date('2026-09-20T10:00:00Z') },
      { area: 'RH', titulo: 'Analista RH', descricao: 'Vaga de RH para teste de relatorio.', status: 'arquivada', createdAt: new Date('2026-01-10T10:00:00Z') },
      { area: 'TI', titulo: 'Dev Back', descricao: 'Vaga de back-end para teste.', status: 'pausada', createdAt: new Date('2026-09-25T10:00:00Z') },
    ],
    { timestamps: false },
  );
  return { v1: String(v1._id), v2: String(v2._id), v3: String(v3._id) };
}

async function semearCandidaturas({ v1, v2 }) {
  await Candidatura.create(
    [
      { usuarioId: 'u1', vagaId: v1, status: 'inscrito', criadoEm: new Date('2026-09-22T10:00:00Z') },
      { usuarioId: 'u2', vagaId: v1, status: 'em_analise', criadoEm: new Date('2026-09-23T10:00:00Z') },
      { usuarioId: 'u3', vagaId: v1, status: 'aprovado', criadoEm: new Date('2026-09-24T10:00:00Z') },
      { usuarioId: 'u4', vagaId: v1, status: 'reprovado', criadoEm: new Date('2026-09-29T10:00:00Z') },
      { usuarioId: 'u5', vagaId: v2, status: 'aprovado', scoreIA: 0.9, justificativa: 'segredo da triagem', criadoEm: new Date('2026-01-15T10:00:00Z') },
    ],
    { timestamps: false },
  );
}

describe('RelatorioService.geral', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('tudo: conta vagas por status e area e candidaturas por etapa', async () => {
    await semearCandidaturas(await semearVagas());

    const r = await service.geral('tudo', AGORA);

    expect(r.periodo).toBe('tudo');
    expect(r.geradoEm).toBe(AGORA.toISOString());
    expect(r.vagas).toEqual({
      total: 3,
      porStatus: { ativa: 1, pausada: 1, arquivada: 1 },
      porArea: [{ area: 'TI', total: 2 }, { area: 'RH', total: 1 }],
    });
    expect(r.candidaturas.total).toBe(5);
    expect(r.candidaturas.porStatus).toEqual({ inscrito: 1, em_analise: 1, aprovado: 2, reprovado: 1 });
    expect(r.candidaturas.taxaAprovacao).toBeCloseTo(2 / 3);
  });

  it('tudo: serie mensal da inscricao mais antiga ate o mes atual', async () => {
    await semearCandidaturas(await semearVagas());

    const { serie } = await service.geral('tudo', AGORA);

    expect(serie.granularidade).toBe('mes');
    expect(serie.pontos).toHaveLength(9);
    expect(serie.pontos[0]).toEqual({ inicio: '2026-01-01', total: 1 });
    expect(serie.pontos[8]).toEqual({ inicio: '2026-09-01', total: 4 });
  });

  it('30d: filtra vagas e candidaturas pela data e agrupa por semana', async () => {
    await semearCandidaturas(await semearVagas());

    const r = await service.geral('30d', AGORA);

    expect(r.vagas.total).toBe(2);
    expect(r.vagas.porStatus).toEqual({ ativa: 1, pausada: 1, arquivada: 0 });
    expect(r.candidaturas.total).toBe(4);
    expect(r.candidaturas.taxaAprovacao).toBe(0.5);
    expect(r.serie).toEqual({
      granularidade: 'semana',
      pontos: [
        { inicio: '2026-08-31', total: 0 },
        { inicio: '2026-09-07', total: 0 },
        { inicio: '2026-09-14', total: 0 },
        { inicio: '2026-09-21', total: 3 },
        { inicio: '2026-09-28', total: 1 },
      ],
    });
  });

  it('taxa de aprovacao e null sem nenhuma decisao', async () => {
    const { v1 } = await semearVagas();
    await Candidatura.create({ usuarioId: 'u1', vagaId: v1, status: 'inscrito' });

    const r = await service.geral('tudo', AGORA);

    expect(r.candidaturas.taxaAprovacao).toBeNull();
  });

  it('nao expoe nenhum campo da triagem', async () => {
    await semearCandidaturas(await semearVagas());

    const texto = JSON.stringify(await service.geral('tudo', AGORA));

    for (const campo of ['scoreIA', 'compativel', 'justificativa', 'limiteAplicado', 'segredo da triagem']) {
      expect(texto).not.toContain(campo);
    }
  });
});

describe('RelatorioService.porVaga', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('404 para id invalido e para vaga inexistente', async () => {
    await expect(service.porVaga('abc', 'tudo', AGORA)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.porVaga('000000000000000000000000', 'tudo', AGORA)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('resume so a vaga pedida e lista candidatos em ordem de funil', async () => {
    const { v1, v2 } = await semearVagas();
    const maria = await Usuario.create({ nome: 'Maria Silva', email: `maria-${Date.now()}@t.com`, tipos_permissao: ['candidato'] });
    await Candidatura.create(
      [
        { usuarioId: String(maria._id), vagaId: v1, status: 'aprovado', criadoEm: new Date('2026-09-24T10:00:00Z') },
        { usuarioId: '0123456789abcdef01234567', vagaId: v1, status: 'inscrito', criadoEm: new Date('2026-09-22T10:00:00Z') },
        { usuarioId: 'u9', vagaId: v2, status: 'reprovado', criadoEm: new Date('2026-09-23T10:00:00Z') },
      ],
      { timestamps: false },
    );

    const r = await service.porVaga(v1, 'tudo', AGORA);

    expect(r.vaga).toEqual({
      id: v1,
      titulo: 'Dev Front',
      area: 'TI',
      status: 'ativa',
      criadoEm: new Date('2026-09-20T10:00:00Z'),
    });
    expect(r.candidaturas).toEqual({
      total: 2,
      porStatus: { inscrito: 1, em_analise: 0, aprovado: 1, reprovado: 0 },
      taxaAprovacao: 1,
    });
    expect(r.candidatos).toEqual([
      { nome: null, status: 'inscrito', inscritoEm: new Date('2026-09-22T10:00:00Z') },
      { nome: 'Maria Silva', status: 'aprovado', inscritoEm: new Date('2026-09-24T10:00:00Z') },
    ]);
    expect(r.serie.pontos.at(-1)).toEqual({ inicio: '2026-09-01', total: 2 });
  });

  it('30d deixa de fora candidatura antiga da mesma vaga', async () => {
    const { v2 } = await semearVagas();
    await Candidatura.create(
      [{ usuarioId: 'u1', vagaId: v2, status: 'aprovado', criadoEm: new Date('2026-01-15T10:00:00Z') }],
      { timestamps: false },
    );

    const r = await service.porVaga(v2, '30d', AGORA);

    expect(r.candidaturas.total).toBe(0);
    expect(r.candidatos).toEqual([]);
  });
});

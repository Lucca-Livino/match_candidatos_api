import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import CandidaturaService from '../../service/CandidaturaService.js';
import Candidatura from '../../models/Candidatura.js';

describe('Transicao de status da candidatura', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const service = new CandidaturaService();

  const semear = (status) => Candidatura.create({ usuarioId: 'u1', vagaId: 'v1', status });

  const mover = (status, ator = 'ana@match.com') =>
    service.atualizarStatusCandidatura('u1', 'v1', { status, movidoPor: 'recrutador' }, ator);

  it.each(['aprovado', 'reprovado'])('%s pode ser reaberto para em_analise', async (finalStatus) => {
    await semear(finalStatus);

    const atualizada = await mover('em_analise');

    expect(atualizada.status).toBe('em_analise');
    expect(atualizada.reabertoPor).toBe('ana@match.com');
    expect(atualizada.reabertoEm).toBeInstanceOf(Date);
  });

  it('mover de em_analise para aprovado nao marca reabertura', async () => {
    await semear('em_analise');

    const atualizada = await mover('aprovado');

    expect(atualizada.status).toBe('aprovado');
    expect(atualizada.reabertoPor).toBeNull();
    expect(atualizada.reabertoEm).toBeNull();
  });

  it('status final nao pula direto para o outro status final', async () => {
    await semear('aprovado');

    await expect(mover('reprovado')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('status final nao volta para inscrito', async () => {
    await semear('reprovado');

    await expect(mover('inscrito')).rejects.toMatchObject({ statusCode: 400 });
  });
});

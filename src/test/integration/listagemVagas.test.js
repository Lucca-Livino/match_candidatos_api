import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import VagaService from '../../service/VagaService.js';
import Vaga from '../../models/Vaga.js';
import Candidatura from '../../models/Candidatura.js';

describe('VagaService.listar — total de candidatos por vaga', () => {
  const service = new VagaService();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('conta as candidaturas de cada vaga da pagina, com zero para vaga sem nenhuma', async () => {
    const [comDuas] = await Vaga.create([
      { area: 'TI', titulo: 'Dev Front', descricao: 'Vaga de front-end para teste.' },
      { area: 'RH', titulo: 'Analista RH', descricao: 'Vaga de RH para teste de listagem.' },
    ]);
    await Candidatura.create([
      { usuarioId: 'u1', vagaId: String(comDuas._id), status: 'inscrito' },
      { usuarioId: 'u2', vagaId: String(comDuas._id), status: 'aprovado' },
    ]);

    const { docs } = await service.listar({ page: 1, limit: 10 });
    const total = Object.fromEntries(docs.map((v) => [v.titulo, v.totalCandidatos]));

    expect(total).toEqual({ 'Dev Front': 2, 'Analista RH': 0 });
  });
});

import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import ItemCatalogo from '../../models/ItemCatalogo.js';
import Vaga from '../../models/Vaga.js';
import VagaService from '../../service/VagaService.js';

describe('VagaService — requisito do criterio obrigatorio', () => {
  const service = new VagaService();
  beforeAll(async () => { await connectTestDatabase(); await ItemCatalogo.init(); });
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const payload = (itemId) => ({
    area: 'TI',
    titulo: 'Back-end',
    descricao: 'Desenvolvimento de APIs.',
    status: 'pausada',
    criterio_vaga: [{
      nome: 'SQL', tipo_criterio: 'skill_tecnica', peso_percentual: 50, obrigatorio: true, requisito: { itemId },
    }],
  });

  it('recusa requisito que aponta para item inexistente', async () => {
    await expect(service.criar(payload('nao-existe'))).rejects.toMatchObject({
      statusCode: 400,
      message: 'criterio_vaga[0].requisito.itemId não corresponde a item do catálogo do tipo habilidade.',
    });
  });

  it('cria quando o item existe no catalogo', async () => {
    await ItemCatalogo.create({ tipo: 'habilidade', nome: 'SQL', id: 'sql' });
    const vaga = await service.criar(payload('sql'));
    expect(vaga.criterio_vaga[0].requisito.itemId).toBe('sql');
  });

  it('vaga legada (obrigatorio sem requisito) aceita PATCH so de status', async () => {
    const legada = await Vaga.create({
      area: 'TI',
      titulo: 'Legada',
      descricao: 'Vaga antiga sem requisito.',
      status: 'ativa',
      criterio_vaga: [{ nome: 'SQL', tipo_criterio: 'skill_tecnica', peso_percentual: 50, obrigatorio: true }],
    });
    const r = await service.atualizar(String(legada._id), { status: 'pausada' });
    expect(r.status).toBe('pausada');
  });
});

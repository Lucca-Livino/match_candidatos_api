import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import AvaliacaoPayloadService from '../../service/AvaliacaoPayloadService.js';
import ItemCatalogo from '../../models/ItemCatalogo.js';
import Vaga from '../../models/Vaga.js';
import Habilidade from '../../models/Habilidade.js';
import { montarMensagem } from '../../service/match/promptAvaliacao.js';

describe('AvaliacaoPayloadService.montar — verificacao', () => {
  beforeAll(async () => { await connectTestDatabase(); await ItemCatalogo.init(); });
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('manda requisito_texto a IA e os ids do catalogo so em verificacao', async () => {
    await ItemCatalogo.create({ tipo: 'habilidade', nome: 'SQL', id: 'cat-9f2a' });
    const vaga = await Vaga.create({
      area: 'TI',
      titulo: 'Back-end',
      descricao: 'Desenvolvimento de APIs.',
      criterio_vaga: [
        { nome: 'SQL', tipo_criterio: 'skill_tecnica', peso_percentual: 50, obrigatorio: true, requisito: { itemId: 'cat-9f2a', nivelMinimo: 'basico' } },
        { nome: 'Node', tipo_criterio: 'skill_tecnica', peso_percentual: 50, obrigatorio: false },
      ],
    });
    await Habilidade.create({ usuarioId: 'u1', habilidade: 'SQL', nivel: 'avancado', itemId: 'cat-9f2a' });

    const payload = await new AvaliacaoPayloadService().montar('u1', String(vaga._id));

    const [obrigatorio, opcional] = payload.vaga.criterios;
    expect(obrigatorio.requisito_texto).toBe('SQL, nivel minimo basico');
    expect(obrigatorio).not.toHaveProperty('requisito');
    expect(opcional).not.toHaveProperty('requisito_texto');
    expect(opcional).not.toHaveProperty('requisito');

    expect(payload.verificacao.criterios[0]).toMatchObject({ nome: 'SQL', obrigatorio: true, requisito: { itemId: 'cat-9f2a', nivelMinimo: 'basico' } });
    expect(payload.verificacao.criterios).toHaveLength(2);
    expect(payload.verificacao.curriculo.habilidades[0].itemId).toBe('cat-9f2a');
    expect(payload.verificacao.indice.porId.get('cat-9f2a').nome).toBe('SQL');

    const mensagem = montarMensagem(payload);
    expect(mensagem).not.toContain('cat-9f2a');
    expect(mensagem).not.toContain('itemId');
    expect(mensagem).toContain('requisito_texto');
  });

  it('requisito incompleto gravado direto no model nao gera requisito_texto', async () => {
    const vaga = await Vaga.collection.insertOne({
      area: 'TI',
      titulo: 'Legada',
      descricao: 'Vaga com requisito incompleto.',
      criterio_vaga: [
        { nome: 'Graduacao', tipo_criterio: 'formacao', peso_percentual: 50, obrigatorio: true, requisito: { aceitaCursando: true } },
      ],
    });

    const payload = await new AvaliacaoPayloadService().montar('u1', String(vaga.insertedId));

    expect(payload.vaga.criterios[0]).not.toHaveProperty('requisito_texto');
    expect(payload.vaga.criterios[0]).not.toHaveProperty('requisito');
  });

  it('vaga inexistente segue dando 404', async () => {
    await expect(new AvaliacaoPayloadService().montar('u1', '64b000000000000000000000'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

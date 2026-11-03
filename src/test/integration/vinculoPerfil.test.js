import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import ItemCatalogo from '../../models/ItemCatalogo.js';
import HabilidadeService from '../../service/HabilidadeService.js';
import CertificacaoService from '../../service/CertificacaoService.js';
import FormacaoService from '../../service/FormacaoService.js';
import ExperienciaService from '../../service/ExperienciaService.js';

describe('vinculo do perfil ao catalogo', () => {
  const habilidades = new HabilidadeService();
  const certificacoes = new CertificacaoService();
  beforeAll(async () => { await connectTestDatabase(); await ItemCatalogo.init(); });
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('recusa itemId inexistente ao criar habilidade', async () => {
    await expect(habilidades.criarHabilidade('u1', { habilidade: 'SQL', nivel: 'basico', itemId: 'nao-existe' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('recusa areaId inexistente em formacao e experiencia', async () => {
    await expect(new FormacaoService().criarFormacao('u1', { areaId: 'x' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(new ExperienciaService().criarExperiencia('u1', { areaId: 'x' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('atualizar item inexistente responde 404 antes de conferir referencia', async () => {
    await expect(habilidades.atualizarHabilidade('u1', '64b000000000000000000000', { itemId: 'x' }))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(new FormacaoService().atualizarFormacao('u1', '64b000000000000000000000', { areaId: 'x' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('habilidade: texto novo sem itemId zera o vinculo; outro campo mantem', async () => {
    await ItemCatalogo.create({ tipo: 'habilidade', nome: 'SQL', id: 'sql' });
    const criada = await habilidades.criarHabilidade('u1', { habilidade: 'SQL', nivel: 'basico', itemId: 'sql' });

    const nivel = await habilidades.atualizarHabilidade('u1', criada.id, { nivel: 'avancado' });
    expect(nivel.itemId).toBe('sql');

    const texto = await habilidades.atualizarHabilidade('u1', criada.id, { habilidade: 'Python' });
    expect(texto.itemId).toBeNull();
  });

  it('habilidade: texto novo com itemId mantem o id enviado', async () => {
    await ItemCatalogo.create({ tipo: 'habilidade', nome: 'Python', id: 'py' });
    const criada = await habilidades.criarHabilidade('u1', { habilidade: 'SQL', nivel: 'basico', itemId: null });
    const r = await habilidades.atualizarHabilidade('u1', criada.id, { habilidade: 'Python', itemId: 'py' });
    expect(r.itemId).toBe('py');
  });

  it('certificacao: nome novo sem itemId zera o vinculo', async () => {
    await ItemCatalogo.create({ tipo: 'certificacao', nome: 'AWS CCP', id: 'aws' });
    const criada = await certificacoes.criarCertificacao('u1', { nome: 'AWS CCP', emissor: 'AWS', itemId: 'aws' });
    const emissor = await certificacoes.atualizarCertificacao('u1', criada.id, { emissor: 'Amazon' });
    expect(emissor.itemId).toBe('aws');
    const nome = await certificacoes.atualizarCertificacao('u1', criada.id, { nome: 'Outra' });
    expect(nome.itemId).toBeNull();
  });
});

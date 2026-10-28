import ItemCatalogo from '../../models/ItemCatalogo.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { registrarCandidato } from './setup/cenarios.js';

describe('E2E — catálogo de requisitos', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
    await ItemCatalogo.init();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const cadastrar = (admin, item) => admin.post('/api/catalogo').send(item).expect(201);

  it('administrador cadastra e o candidato encontra pelo nome ou sinônimo, sem acento nem caixa', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const candidato = await registrarCandidato(app);
    const criado = await cadastrar(admin, { tipo: 'habilidade', nome: 'Node.js', sinonimos: ['NodeJS'] });
    expect(criado.body.data).not.toHaveProperty('_id');
    await cadastrar(admin, { tipo: 'area_curso', nome: 'Computação' });

    const porNome = await candidato.get('/api/catalogo?tipo=habilidade&q=node').expect(200);
    expect(porNome.body.data.map((i) => i.nome)).toEqual(['Node.js']);

    const outroTipo = await candidato.get('/api/catalogo?tipo=area_curso&q=COMPUTACAO').expect(200);
    expect(outroTipo.body.data.map((i) => i.nome)).toEqual(['Computação']);

    await candidato.get('/api/catalogo?tipo=inexistente').expect(400);
  });

  it('recusa nome ou sinônimo já usado por outro item do mesmo tipo', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    await cadastrar(admin, { tipo: 'habilidade', nome: 'JavaScript', sinonimos: ['JS'] });

    const repetido = await admin.post('/api/catalogo').send({ tipo: 'habilidade', nome: 'js' }).expect(409);
    expect(repetido.body.error.code).toBe('CONFLICT');

    await cadastrar(admin, { tipo: 'certificacao', nome: 'JS' });
  });

  it('item desativado sai do autocomplete, segue na tela do admin e continua aceito no perfil', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const candidato = await registrarCandidato(app);
    const criado = await cadastrar(admin, { tipo: 'habilidade', nome: 'Cobol' });
    const itemId = criado.body.data.id;

    await admin.patch(`/api/catalogo/${itemId}`).send({ ativo: false }).expect(200);

    const busca = await candidato.get('/api/catalogo?tipo=habilidade&q=cobol').expect(200);
    expect(busca.body.data).toEqual([]);

    const todos = await admin.get('/api/catalogo?tipo=habilidade&todos=true').expect(200);
    expect(todos.body.data).toEqual([expect.objectContaining({ id: itemId, ativo: false })]);
    const negado = await candidato.get('/api/catalogo?tipo=habilidade&todos=true').expect(403);
    expect(negado.body.error.code).toBe('FORBIDDEN');

    await candidato
      .post(`/api/usuarios/${candidato.id}/habilidade`)
      .send({ habilidade: 'Cobol', nivel: 'basico', itemId })
      .expect(201);
  });

  it('perfil recusa vínculo com item inexistente ou de outro tipo', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const candidato = await registrarCandidato(app);
    const area = await cadastrar(admin, { tipo: 'area_curso', nome: 'Engenharia' });
    const habilidade = (itemId) =>
      candidato.post(`/api/usuarios/${candidato.id}/habilidade`).send({ habilidade: 'Algo', nivel: 'basico', itemId });

    const outroTipo = await habilidade(area.body.data.id).expect(400);
    expect(outroTipo.body.error.code).toBe('VALIDATION_ERROR');
    await habilidade('id-que-nao-existe').expect(400);
  });

  it('edita nome e sinônimos, e o autocomplete passa a casar pelo novo texto', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const criado = await cadastrar(admin, { tipo: 'habilidade', nome: 'React' });
    const itemId = criado.body.data.id;

    await admin.patch(`/api/catalogo/${itemId}`).send({ nome: 'React.js', sinonimos: ['ReactJS'] }).expect(200);

    const busca = await admin.get('/api/catalogo?tipo=habilidade&q=reactjs').expect(200);
    expect(busca.body.data.map((i) => i.id)).toEqual([itemId]);
  });

  it('recusa edição de tipo, implicação de si mesmo e item inexistente', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const criado = await cadastrar(admin, { tipo: 'habilidade', nome: 'Python' });
    const itemId = criado.body.data.id;
    const outro = await cadastrar(admin, { tipo: 'area_curso', nome: 'Física' });

    await admin.patch(`/api/catalogo/${itemId}`).send({ tipo: 'area_curso' }).expect(400);
    await admin.patch(`/api/catalogo/${itemId}`).send({ implica: [itemId] }).expect(400);
    await admin.patch(`/api/catalogo/${itemId}`).send({ implica: [outro.body.data.id] }).expect(400);
    await admin.patch(`/api/catalogo/${itemId}`).send({ ativo: 'nao' }).expect(400);
    await admin.patch('/api/catalogo/id-inexistente').send({ ativo: false }).expect(404);
  });
});

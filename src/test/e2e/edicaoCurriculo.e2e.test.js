import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { registrarCandidato } from './setup/cenarios.js';

describe('E2E — edição do currículo', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const SECOES = {
    formacao: {
      criar: {
        instituicao: 'Universidade E2E',
        curso: 'Sistemas de Informação',
        grau: 'graduacao',
        situacao: 'cursando',
        anoInicio: 2021,
        anoConclusao: 2025,
      },
      editar: { situacao: 'concluido', anoConclusao: 2024 },
      conferir: { situacao: 'concluido', anoConclusao: 2024 },
    },
    experiencia: {
      criar: {
        empresa: 'Empresa E2E',
        cargo: 'Estagiária',
        dataInicio: '2022-01-01',
        dataFim: '2022-07-01',
        descricaoAtivida_: 'Suporte ao time de APIs.',
      },
      editar: { cargo: 'Desenvolvedora Júnior', dataFim: '2023-01-01' },
      conferir: { cargo: 'Desenvolvedora Júnior', mesesDuracao: 12 },
    },
    habilidade: {
      criar: { habilidade: 'SQL', nivel: 'basico' },
      editar: { nivel: 'avancado' },
      conferir: { habilidade: 'SQL', nivel: 'avancado' },
    },
    certificacao: {
      criar: { nome: 'Certificação E2E', emissor: 'Emissor E2E', dataEmissao: '2020-01-01' },
      editar: { dataExpiracao: '2021-01-01' },
      conferir: { nome: 'Certificação E2E', expirada: true },
    },
  };

  describe.each(Object.keys(SECOES))('%s', (secao) => {
    const { criar, editar, conferir } = SECOES[secao];

    it('candidato edita, lê de volta e remove o próprio item', async () => {
      const candidato = await registrarCandidato(app);
      const base = `/api/usuarios/${candidato.id}/${secao}`;

      const criado = await candidato.post(base).send(criar).expect(201);
      const itemId = criado.body.data.id;

      const editado = await candidato.put(`${base}/${itemId}`).send(editar).expect(200);
      expect(editado.body.data).toMatchObject(conferir);

      const lista = await candidato.get(base).expect(200);
      expect(lista.body.data).toHaveLength(1);
      expect(lista.body.data[0]).toMatchObject({ id: itemId, ...conferir });

      const removido = await candidato.delete(`${base}/${itemId}`).expect(200);
      expect(removido.body.data).toEqual({ id: itemId, deletado: true });

      const vazia = await candidato.get(base).expect(200);
      expect(vazia.body.data).toEqual([]);
      await candidato.delete(`${base}/${itemId}`).expect(404);
      await candidato.put(`${base}/${itemId}`).send(editar).expect(404);
    });

    it('não edita nem remove item de outro candidato, nem pela própria URL', async () => {
      const dona = await registrarCandidato(app);
      const intrusa = await registrarCandidato(app, { email: 'intrusa@e2e.test', nome: 'Intrusa E2E' });
      const criado = await dona.post(`/api/usuarios/${dona.id}/${secao}`).send(criar).expect(201);
      const itemId = criado.body.data.id;

      await intrusa.put(`/api/usuarios/${dona.id}/${secao}/${itemId}`).send(editar).expect(403);
      await intrusa.delete(`/api/usuarios/${dona.id}/${secao}/${itemId}`).expect(403);

      await intrusa.put(`/api/usuarios/${intrusa.id}/${secao}/${itemId}`).send(editar).expect(404);
      await intrusa.delete(`/api/usuarios/${intrusa.id}/${secao}/${itemId}`).expect(404);

      const lista = await dona.get(`/api/usuarios/${dona.id}/${secao}`).expect(200);
      expect(lista.body.data).toHaveLength(1);
    });

    it('recrutador lê o item, mas não edita nem remove', async () => {
      const candidato = await registrarCandidato(app);
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const base = `/api/usuarios/${candidato.id}/${secao}`;
      const criado = await candidato.post(base).send(criar).expect(201);
      const itemId = criado.body.data.id;

      const lista = await recrutador.get(base).expect(200);
      expect(lista.body.data.map((item) => item.id)).toEqual([itemId]);

      await recrutador.put(`${base}/${itemId}`).send(editar).expect(403);
      await recrutador.delete(`${base}/${itemId}`).expect(403);
    });
  });

  it('formação recusa conclusão antes do início e concluída sem ano', async () => {
    const candidato = await registrarCandidato(app);
    const base = `/api/usuarios/${candidato.id}/formacao`;
    const criado = await candidato.post(base).send(SECOES.formacao.criar).expect(201);
    const url = `${base}/${criado.body.data.id}`;

    await candidato.put(url).send({ anoConclusao: 2019 }).expect(400);
    await candidato.put(url).send({ situacao: 'concluido', anoConclusao: null }).expect(400);
    await candidato.put(url).send({}).expect(400);
  });

  it('experiência recusa fim antes do início, inclusive contra a data já gravada', async () => {
    const candidato = await registrarCandidato(app);
    const base = `/api/usuarios/${candidato.id}/experiencia`;
    const criado = await candidato.post(base).send(SECOES.experiencia.criar).expect(201);
    const url = `${base}/${criado.body.data.id}`;

    const res = await candidato.put(url).send({ dataFim: '2021-12-01' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('habilidade recusa nível fora da lista', async () => {
    const candidato = await registrarCandidato(app);
    const base = `/api/usuarios/${candidato.id}/habilidade`;
    const criado = await candidato.post(base).send(SECOES.habilidade.criar).expect(201);

    await candidato.put(`${base}/${criado.body.data.id}`).send({ nivel: 'guru' }).expect(400);
  });
});

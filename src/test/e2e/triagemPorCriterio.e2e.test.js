import ItemCatalogo from '../../models/ItemCatalogo.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { configurarIA, restaurarIA } from './setup/iaFalsa.js';
import {
  CRITERIO_NODE,
  publicarVaga,
  registrarCandidato,
  montarCurriculo,
  candidatarEResponder,
  aguardarAvaliacao,
  aguardarDisparo,
} from './setup/cenarios.js';

// Triagem vista por dentro: o modelo da nota por criterio e o sistema combina
// pelos pesos da vaga. Aqui a IA falsa da notas diferentes por criterio, para
// que o score dependa da conta, e nao de uma nota unica repetida.
describe('E2E — triagem por critério', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
    await ItemCatalogo.init();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  const criterio = (nome, peso, extra = {}) => ({ nome, tipo_criterio: 'skill_tecnica', peso_percentual: peso, ...extra });

  const triar = async (criterios, { email } = {}) => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { criterios });
    const candidato = await registrarCandidato(app, email ? { email } : undefined);
    await montarCurriculo(candidato);
    await candidatarEResponder(candidato, vaga);
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);
    return { recrutador, vaga, candidato, avaliada };
  };

  it('pondera pelo peso: 10/10/80 com notas 1/1/0,5 dá 0,60 e não promove', async () => {
    // Caso do D22: a media simples seria 0,83 e promoveria.
    configurarIA({ notas: { 'Node.js': 1, Express: 1, 'Banco de dados': 0.5 } });
    const { avaliada } = await triar([criterio('Node.js', 10), criterio('Express', 10), criterio('Banco de dados', 80)]);

    expect(avaliada.scoreIA).toBe(0.6);
    expect(avaliada.compativel).toBe(0);
    expect(avaliada.status).toBe('inscrito');
  });

  it('divide pela soma real dos pesos quando ela fica abaixo de 100', async () => {
    configurarIA({ notas: { 'Node.js': 1, Express: 0.5 } });
    const { avaliada } = await triar([criterio('Node.js', 30), criterio('Express', 20)]);

    // (30 x 1 + 20 x 0,5) / 50; dividir por 100 daria 0,40.
    expect(avaliada.scoreIA).toBe(0.8);
    expect(avaliada.status).toBe('em_analise');
  });

  it('critério omitido pelo modelo entra como 0 e fica marcado no registro', async () => {
    configurarIA({ notas: { 'Node.js': 1 } });
    const { avaliada } = await triar([criterio('Node.js', 50), criterio('Express', 50)]);

    expect(avaliada.scoreIA).toBe(0.5);
    expect(avaliada.status).toBe('inscrito');
    const express = avaliada.criteriosAvaliados.find((c) => c.nome === 'Express');
    expect(express).toMatchObject({ aderencia: 0, evidencia: '', atendido: false, omitido: true });
  });

  it('suporte audita a nota por critério com nome e peso da época da avaliação', async () => {
    configurarIA({ notas: { 'Node.js': 0.9, Express: 0.6 } });
    const { recrutador, vaga } = await triar([criterio('Node.js', 60), criterio('Express', 40)]);
    const suporte = await criarUsuarioLogado(app, 'suporte');

    // O recrutador muda os pesos depois; o registro guarda os que valiam.
    await recrutador
      .patch(`/api/vagas/${vaga.vagaId}`)
      .send({ criterio_vaga: [criterio('Node.js', 20), criterio('Express', 80)] })
      .expect(200);

    const auditoria = await suporte.get('/api/avaliacoes').expect(200);
    const [registro] = auditoria.body.data;
    expect(registro.scoreIA).toBe(0.78);
    expect(registro.criteriosAvaliados).toEqual([
      expect.objectContaining({ nome: 'Node.js', peso: 60, aderencia: 0.9, evidencia: 'Evidencia simulada de Node.js.', omitido: false }),
      expect.objectContaining({ nome: 'Express', peso: 40, aderencia: 0.6, omitido: false }),
    ]);
  });

  it('reavaliar substitui as notas por critério e pode promover a candidatura', async () => {
    configurarIA({ notas: { 'Node.js': 0.4 } });
    const { vaga, candidato, avaliada } = await triar([criterio('Node.js', 100)]);
    expect(avaliada.status).toBe('inscrito');

    restaurarIA();
    configurarIA({ notas: { 'Node.js': 0.9 } });
    const suporte = await criarUsuarioLogado(app, 'suporte');
    await suporte.post(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/reavaliar`).expect(200);

    const auditoria = await suporte.get('/api/avaliacoes').expect(200);
    const [registro] = auditoria.body.data;
    expect(registro.scoreIA).toBe(0.9);
    expect(registro.status).toBe('em_analise');
    expect(registro.criteriosAvaliados).toHaveLength(1);
    expect(registro.criteriosAvaliados[0].aderencia).toBe(0.9);
  });

  it('nem recrutador nem candidato recebem nota ou evidência por critério', async () => {
    configurarIA({ notas: { 'Node.js': 0.9 } });
    const { recrutador, vaga, candidato } = await triar([criterio('Node.js', 100)]);

    const respostas = [
      await recrutador.get(`/api/vagas/${vaga.vagaId}/candidaturas`).expect(200),
      await recrutador.get(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/ficha`).expect(200),
      await candidato.get(`/api/usuarios/${candidato.id}/candidatura`).expect(200),
      await candidato.get(`/api/usuarios/${candidato.id}/candidatura/${vaga.vagaId}`).expect(200),
    ];
    for (const res of respostas) {
      const corpo = JSON.stringify(res.body);
      expect(corpo).not.toContain('criteriosAvaliados');
      expect(corpo).not.toContain('Evidencia simulada');
    }
  });

  it('objetivas chegam ao modelo já corrigidas pelo gabarito', async () => {
    const ia = configurarIA();
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { ativar: false });

    const objetiva = async (enunciado, ordem, opcoes) => {
      const pergunta = await recrutador
        .post('/api/pergunta')
        .send({ questionarioId: vaga.questionarioId, enunciado, tipoResposta: 'multipla_escolha', peso: 1, ordem })
        .expect(201);
      const ids = {};
      for (const [i, [texto, correta]] of opcoes.entries()) {
        const opcao = await recrutador
          .post(`/api/pergunta/${pergunta.body.data.id}/opcao`)
          .send({ texto, correta, ordem: i + 1 })
          .expect(201);
        ids[texto] = opcao.body.data.id;
      }
      return { perguntaId: pergunta.body.data.id, ids };
    };

    const motor = await objetiva('Qual motor executa o Node.js?', 2, [['V8', 1], ['JVM', 0]]);
    const banco = await objetiva('Qual banco orientado a documentos?', 3, [['PostgreSQL', 0], ['MongoDB', 1]]);
    const opiniao = await objetiva('Qual editor você prefere?', 4, [['VS Code', 0], ['Vim', 0]]);
    await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'ativa' }).expect(200);

    const candidato = await registrarCandidato(app);
    await montarCurriculo(candidato);
    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
    const iniciada = await candidato
      .post('/api/resposta-questionario/iniciar')
      .send({ questionarioId: vaga.questionarioId, usuarioId: candidato.id })
      .expect(201);
    const respostaId = iniciada.body.data.id;
    await candidato
      .post(`/api/resposta-questionario/${respostaId}/responder`)
      .send({
        respostas: [
          { perguntaId: vaga.perguntaId, textoResposta: 'Três anos com Node.js.' },
          { perguntaId: motor.perguntaId, opcaoRespostaIds: [motor.ids.V8] },
          { perguntaId: banco.perguntaId, opcaoRespostaIds: [banco.ids.PostgreSQL] },
          { perguntaId: opiniao.perguntaId, opcaoRespostaIds: [opiniao.ids.Vim] },
        ],
      })
      .expect(200);
    await candidato.patch(`/api/resposta-questionario/${respostaId}/finalizar`).expect(200);
    await aguardarDisparo(ia);

    const [payload] = ia.mock.calls[0];
    const porEnunciado = Object.fromEntries(payload.questionario.respostas.map((r) => [r.enunciado, r]));

    expect(porEnunciado['Qual motor executa o Node.js?']).toMatchObject({ gabarito: ['V8'], acertou: true });
    expect(porEnunciado['Qual banco orientado a documentos?']).toMatchObject({
      opcoesSelecionadas: ['PostgreSQL'],
      gabarito: ['MongoDB'],
      acertou: false,
    });
    expect(porEnunciado['Qual editor você prefere?']).toMatchObject({ gabarito: [], acertou: null });
    expect(porEnunciado['Conte sua experiência com Node.js.']).not.toHaveProperty('acertou');
  });

  describe('gate de obrigatórios pelo catálogo', () => {
    const vagaComDocker = async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const docker = await admin
        .post('/api/catalogo')
        .send({ tipo: 'habilidade', nome: 'Docker', sinonimos: ['Docker Engine'] })
        .expect(201);
      return [
        { ...CRITERIO_NODE, peso_percentual: 50 },
        criterio('Docker', 50, { obrigatorio: true, requisito: { itemId: docker.body.data.id } }),
      ];
    };

    it('barra sem chamar a IA, zera a nota e mantém a candidatura em inscrito', async () => {
      const ia = configurarIA();
      const { avaliada } = await triar(await vagaComDocker());

      expect(ia).not.toHaveBeenCalled();
      expect(avaliada).toMatchObject({ compativel: 0, scoreIA: 0, status: 'inscrito', versaoModelo: null });
      expect(avaliada.criteriosAvaliados).toEqual([]);
      expect(avaliada.justificativa).toContain('sem consulta ao modelo');
    });

    it('casa a habilidade sem vínculo pelo sinônimo do catálogo e segue para a IA', async () => {
      const ia = configurarIA();
      const criterios = await vagaComDocker();
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarVaga(recrutador, { criterios });
      const candidato = await registrarCandidato(app);
      await montarCurriculo(candidato);
      // Texto livre, sem itemId, em caixa e acento diferentes do sinônimo.
      await candidato
        .post(`/api/usuarios/${candidato.id}/habilidade`)
        .send({ habilidade: 'docker engine', nivel: 'intermediario' })
        .expect(201);
      await candidatarEResponder(candidato, vaga);
      const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

      expect(ia).toHaveBeenCalledTimes(1);
      expect(avaliada.scoreIA).toBe(1);
      expect(avaliada.status).toBe('em_analise');
    });
  });
});

import ItemCatalogo from '../../models/ItemCatalogo.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { configurarIA, restaurarIA } from './setup/iaFalsa.js';
import {
  publicarVaga,
  registrarCandidato,
  candidatarEResponder,
  aguardarAvaliacao,
  aguardarDisparo,
} from './setup/cenarios.js';

describe('E2E — gate de requisitos obrigatórios', () => {
  let app;
  let admin;
  let catalogo;

  beforeAll(async () => {
    app = await subirAmbiente();
    await ItemCatalogo.init();
  });
  beforeEach(async () => {
    admin = await criarUsuarioLogado(app, 'administrador');
    const cadastrar = async (item) => (await admin.post('/api/catalogo').send(item).expect(201)).body.data.id;
    const sql = await cadastrar({ tipo: 'habilidade', nome: 'SQL' });
    const postgres = await cadastrar({ tipo: 'habilidade', nome: 'PostgreSQL', implica: [sql] });
    const bancoRelacional = await cadastrar({ tipo: 'habilidade', nome: 'Banco relacional' });
    await admin.patch(`/api/catalogo/${sql}`).send({ implica: [bancoRelacional] }).expect(200);
    catalogo = {
      sql,
      postgres,
      bancoRelacional,
      typescript: await cadastrar({ tipo: 'habilidade', nome: 'TypeScript', sinonimos: ['TS'] }),
      computacao: await cadastrar({ tipo: 'area_curso', nome: 'Computação', sinonimos: ['Ciência da Computação'] }),
      backend: await cadastrar({ tipo: 'area_atuacao', nome: 'Back-end', sinonimos: ['Desenvolvedora Back-end'] }),
      aws: await cadastrar({ tipo: 'certificacao', nome: 'AWS Cloud Practitioner' }),
    };
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  const obrigatorio = (nome, tipo_criterio, requisito, peso = 100) => ({
    nome,
    tipo_criterio,
    peso_percentual: peso,
    obrigatorio: true,
    requisito,
  });

  const perfil = {
    habilidade: (habilidade, nivel) => ({ secao: 'habilidade', corpo: { habilidade, nivel } }),
    formacao: (curso, grau, situacao) => ({
      secao: 'formacao',
      corpo: {
        instituicao: 'Universidade E2E',
        curso,
        grau,
        situacao,
        anoInicio: 2020,
        anoConclusao: situacao === 'cursando' ? 2027 : 2024,
      },
    }),
    experiencia: (cargo, dataInicio, dataFim) => ({
      secao: 'experiencia',
      corpo: { empresa: 'Empresa E2E', cargo, dataInicio, dataFim, descricaoAtivida_: 'Atividades.' },
    }),
    certificacao: (nome, itemId) => ({
      secao: 'certificacao',
      corpo: { nome, emissor: 'Emissor', dataEmissao: '2024-03-15', ...(itemId ? { itemId } : {}) },
    }),
  };

  const triar = async (criterios, itens, email = 'candidata@e2e.test') => {
    restaurarIA();
    const ia = configurarIA();
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { criterios });
    const candidato = await registrarCandidato(app, { email });
    for (const { secao, corpo } of itens) {
      await candidato.post(`/api/usuarios/${candidato.id}/${secao}`).send(corpo).expect(201);
    }
    await candidatarEResponder(candidato, vaga);
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);
    return { ia, avaliada, vaga, candidato };
  };

  const esperarBarrada = ({ ia, avaliada }, ...motivos) => {
    expect(ia).not.toHaveBeenCalled();
    expect(avaliada).toMatchObject({ compativel: 0, scoreIA: 0, status: 'inscrito' });
    for (const motivo of motivos) expect(avaliada.justificativa).toContain(motivo);
  };

  const esperarLiberada = ({ ia, avaliada }) => {
    expect(ia).toHaveBeenCalledTimes(1);
    expect(avaliada.status).toBe('em_analise');
  };

  describe('habilidade', () => {
    const exigeTypescript = (nivelMinimo) => [
      obrigatorio('TypeScript', 'skill_tecnica', { itemId: catalogo.typescript, nivelMinimo }),
    ];

    it('barra quando o nível declarado fica abaixo do mínimo', async () => {
      const resultado = await triar(exigeTypescript('avancado'), [perfil.habilidade('TypeScript', 'intermediario')]);
      esperarBarrada(resultado, 'TypeScript: nível mínimo avançado, declarado intermediário.');
    });

    it('libera nível acima do mínimo, casando pelo sinônimo e usando o melhor nível declarado', async () => {
      esperarLiberada(
        await triar(exigeTypescript('avancado'), [
          perfil.habilidade('TS', 'basico'),
          perfil.habilidade('typescript', 'especialista'),
        ]),
      );
    });

    it('item que implica o exigido comprova a habilidade', async () => {
      esperarLiberada(
        await triar([obrigatorio('SQL', 'skill_tecnica', { itemId: catalogo.sql })], [perfil.habilidade('PostgreSQL', 'avancado')]),
      );
    });

    it('não segue cadeia de implicação além de um nível', async () => {
      const resultado = await triar(
        [obrigatorio('Banco relacional', 'skill_tecnica', { itemId: catalogo.bancoRelacional })],
        [perfil.habilidade('PostgreSQL', 'avancado')],
      );
      esperarBarrada(resultado, 'Banco relacional: não encontrado no perfil.');
    });
  });

  describe('formação', () => {
    const exigeGraduacao = (extra = {}) => [
      obrigatorio('Graduação em Computação', 'formacao', { grauMinimo: 'graduacao', areaId: catalogo.computacao, ...extra }),
    ];
    const MOTIVO = 'Graduação em Computação: nenhuma formação atende ao grau, à área e à situação exigidos.';

    it('barra grau abaixo do mínimo', async () => {
      esperarBarrada(await triar(exigeGraduacao(), [perfil.formacao('Ciência da Computação', 'tecnico', 'concluido')]), MOTIVO);
    });

    it('barra área diferente da exigida', async () => {
      esperarBarrada(await triar(exigeGraduacao(), [perfil.formacao('Administração', 'graduacao', 'concluido')]), MOTIVO);
    });

    it('libera grau acima do mínimo na área exigida', async () => {
      esperarLiberada(await triar(exigeGraduacao(), [perfil.formacao('Ciência da Computação', 'mestrado', 'concluido')]));
    });

    it('formação em curso só conta quando a vaga aceita cursando', async () => {
      const cursando = [perfil.formacao('Computação', 'graduacao', 'cursando')];
      esperarBarrada(await triar(exigeGraduacao(), cursando), MOTIVO);
      esperarLiberada(await triar(exigeGraduacao({ aceitaCursando: true }), cursando, 'outra@e2e.test'));
    });
  });

  describe('experiência', () => {
    const exigeAnoDeBackend = () => [obrigatorio('Experiência em back-end', 'experiencia', { areaId: catalogo.backend, mesesMinimos: 12 })];

    it('soma os meses de todas as experiências da área', async () => {
      esperarLiberada(
        await triar(exigeAnoDeBackend(), [
          perfil.experiencia('Desenvolvedora Back-end', '2021-01-15', '2021-09-15'),
          perfil.experiencia('Back-end', '2022-01-15', '2022-07-15'),
        ]),
      );
    });

    it('barra com menos meses que o mínimo e não conta experiência de outra área', async () => {
      const resultado = await triar(exigeAnoDeBackend(), [
        perfil.experiencia('Desenvolvedora Back-end', '2021-01-15', '2021-09-15'),
        perfil.experiencia('Analista de suporte', '2018-01-15', '2020-01-15'),
      ]);
      esperarBarrada(resultado, 'Experiência em back-end: mínimo de 12 meses na área, encontrados 8.');
    });
  });

  describe('certificação', () => {
    const exigeAws = () => [obrigatorio('AWS', 'certificacao', { itemId: catalogo.aws })];

    it('libera certificação vinculada ao item do catálogo', async () => {
      esperarLiberada(await triar(exigeAws(), [perfil.certificacao('Certificado da AWS', catalogo.aws)]));
    });

    it('barra quando o perfil não tem a certificação', async () => {
      esperarBarrada(await triar(exigeAws(), [perfil.certificacao('Scrum Master')]), 'AWS: não encontrado no perfil.');
    });
  });

  it('com vários obrigatórios faltando, registra o motivo de cada um', async () => {
    const resultado = await triar(
      [
        obrigatorio('TypeScript', 'skill_tecnica', { itemId: catalogo.typescript }, 50),
        obrigatorio('AWS', 'certificacao', { itemId: catalogo.aws }, 50),
      ],
      [],
    );
    esperarBarrada(resultado, 'TypeScript: não encontrado no perfil.', 'AWS: não encontrado no perfil.');
  });

  it('vaga sem critérios fica pendente sem chamar a IA, e reavaliar recusa', async () => {
    const ia = configurarIA();
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { criterios: [] });
    const candidato = await registrarCandidato(app);
    await candidatarEResponder(candidato, vaga);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(ia).not.toHaveBeenCalled();
    const suporte = await criarUsuarioLogado(app, 'suporte');
    const pendentes = await suporte.get('/api/avaliacoes?pendentes=true').expect(200);
    expect(pendentes.body.data).toHaveLength(1);

    const recusa = await suporte.post(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/reavaliar`).expect(409);
    expect(recusa.body.error.code).toBe('BUSINESS_RULE_ERROR');
  });

  it('score exatamente no limiar promove a candidatura', async () => {
    const ia = configurarIA({ aderencia: 0.7 });
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await candidatarEResponder(candidato, vaga);
    await aguardarDisparo(ia);
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(avaliada).toMatchObject({ scoreIA: 0.7, limiteAplicado: 0.7, compativel: 1, status: 'em_analise' });
  });
});

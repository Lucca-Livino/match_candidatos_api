import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import FichaCandidaturaService from '../../service/FichaCandidaturaService.js';
import Candidatura from '../../models/Candidatura.js';
import Usuario from '../../models/Usuario.js';
import Vaga from '../../models/Vaga.js';
import Formacao from '../../models/Formacao.js';
import Experiencia from '../../models/Experiencia.js';
import Habilidade from '../../models/Habilidade.js';
import Certificacao from '../../models/Certificacao.js';

const CHAVES_TRIAGEM = [
  'scoreIA',
  'compativel',
  'justificativa',
  'motivoIncompat_',
  'limiteAplicado',
  'versaoModelo',
  'avaliadoEm',
  'movidoPor',
  'gabarito',
  'acertou',
  'opcoesDisponiveis',
];

const questionarioStub = {
  titulo: 'Questionario Dev',
  respostas: [
    {
      perguntaId: 'p1',
      enunciado: 'Qual stack?',
      tipoResposta: 'multipla_escolha',
      textoResposta: '',
      opcoesSelecionadas: ['Node.js'],
      opcoesDisponiveis: ['Node.js', 'Nenhuma'],
      gabarito: ['Node.js'],
      acertou: true,
    },
    {
      perguntaId: 'p2',
      enunciado: 'Descreva um projeto.',
      tipoResposta: 'dissertativa',
      textoResposta: 'Uma API de agendamento.',
      opcoesSelecionadas: [],
    },
  ],
};

describe('FichaCandidaturaService.montar', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const montarService = () =>
    new FichaCandidaturaService(undefined, {
      montarQuestionario: jest.fn().mockResolvedValue(questionarioStub),
    });

  const semear = async () => {
    const usuario = await Usuario.create({
      nome: 'Elisa Candidata',
      email: `elisa-${Date.now()}@t.com`,
      tipos_permissao: ['candidato'],
      telefone: '(11) 98765-4321',
      cidade: 'Sao Paulo',
      linkedin: 'https://www.linkedin.com/in/elisa',
    });
    const vaga = await Vaga.create({
      area: 'TI',
      titulo: 'Dev Full Stack',
      descricao: 'Vaga para pessoa desenvolvedora full stack.',
    });
    const usuarioId = String(usuario._id);
    const vagaId = String(vaga._id);

    await Candidatura.create({
      usuarioId,
      vagaId,
      status: 'em_analise',
      scoreIA: 0.95,
      compativel: 1,
      limiteAplicado: 0.7,
      versaoModelo: 'modelo-x',
      justificativa: 'Perfil aderente.',
      avaliadoEm: new Date(),
      movidoPor: 'ia',
    });
    await Formacao.create({
      usuarioId, instituicao: 'UFSC', curso: 'SI', grau: 'graduacao',
      situacao: 'concluido', anoInicio: 2016, anoConclusao: 2020,
    });
    await Experiencia.create({
      usuarioId, empresa: 'TechNova', cargo: 'Dev', descricaoAtivida_: 'APIs Node.',
      dataInicio: new Date('2021-03-01'), dataFim: null, mesesDuracao: 40,
    });
    await Habilidade.create({ usuarioId, habilidade: 'Node.js', nivel: 'avancado' });
    await Certificacao.create({ usuarioId, nome: 'AWS CCP', emissor: 'AWS' });

    return { usuarioId, vagaId };
  };

  it('devolve 404 quando nao existe candidatura para o par', async () => {
    const { usuarioId } = await semear();
    await expect(
      montarService().montar(usuarioId, '000000000000000000000000'),
    ).rejects.toThrow('Candidatura não encontrada.');
  });

  it('devolve 404 quando o usuario da candidatura nao existe mais', async () => {
    const { usuarioId, vagaId } = await semear();
    await Usuario.deleteOne({ _id: usuarioId });
    await expect(
      montarService().montar(usuarioId, vagaId),
    ).rejects.toThrow('Candidatura não encontrada.');
  });

  it('monta candidato com contato, vaga, candidatura e curriculo', async () => {
    const { usuarioId, vagaId } = await semear();
    const ficha = await montarService().montar(usuarioId, vagaId);

    expect(ficha.candidato).toEqual({
      id: usuarioId,
      nome: 'Elisa Candidata',
      email: expect.stringContaining('@t.com'),
      telefone: '(11) 98765-4321',
      cidade: 'Sao Paulo',
      linkedin: 'https://www.linkedin.com/in/elisa',
    });
    expect(ficha.vaga).toEqual({ id: vagaId, titulo: 'Dev Full Stack', area: 'TI' });
    expect(ficha.candidatura.status).toBe('em_analise');
    expect(ficha.curriculo.formacoes).toHaveLength(1);
    expect(ficha.curriculo.experiencias[0]).toMatchObject({ empresa: 'TechNova', dataFim: null });
    expect(ficha.curriculo.habilidades[0]).toMatchObject({ habilidade: 'Node.js', nivel: 'avancado' });
    expect(ficha.curriculo.certificacoes[0]).toMatchObject({ nome: 'AWS CCP', codigo: '' });
  });

  it('repassa as respostas do questionario', async () => {
    const { usuarioId, vagaId } = await semear();
    const ficha = await montarService().montar(usuarioId, vagaId);

    expect(ficha.questionario.titulo).toBe('Questionario Dev');
    expect(ficha.questionario.respostas).toEqual([
      { perguntaId: 'p1', enunciado: 'Qual stack?', tipoResposta: 'multipla_escolha', textoResposta: '', opcoesSelecionadas: ['Node.js'] },
      { perguntaId: 'p2', enunciado: 'Descreva um projeto.', tipoResposta: 'dissertativa', textoResposta: 'Uma API de agendamento.', opcoesSelecionadas: [] },
    ]);
  });

  it('nao carrega nenhum campo da triagem, em nenhum nivel', async () => {
    const { usuarioId, vagaId } = await semear();
    const json = JSON.stringify(await montarService().montar(usuarioId, vagaId));
    for (const chave of CHAVES_TRIAGEM) {
      expect(json).not.toContain(`"${chave}"`);
    }
  });
});

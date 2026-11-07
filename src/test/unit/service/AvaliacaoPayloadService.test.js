import AvaliacaoPayloadService from '../../../service/AvaliacaoPayloadService.js';
import Vaga from '../../../models/Vaga.js';
import Habilidade from '../../../models/Habilidade.js';
import Formacao from '../../../models/Formacao.js';
import Experiencia from '../../../models/Experiencia.js';
import Certificacao from '../../../models/Certificacao.js';
import Questionario from '../../../models/Questionario.js';
import Pergunta from '../../../models/Pergunta.js';
import OpcaoResposta from '../../../models/OpcaoResposta.js';
import RespostaQuestionario from '../../../models/RespostaQuestionario.js';
import RespostaPergunta from '../../../models/RespostaPergunta.js';
import RespostaOpcaoSelecionada from '../../../models/RespostaOpcaoSelecionada.js';
import AppError from '../../../utils/helpers/AppError.js';

const USUARIO_ID = 'usuario-1';
const VAGA_ID = 'vaga-1';

const consulta = (valor) => {
  const lean = jest.fn().mockResolvedValue(valor);
  return { lean, sort: jest.fn().mockReturnValue({ lean }) };
};
const consultaQueFalha = () => ({ lean: jest.fn().mockRejectedValue(new Error('CastError')) });

const indice = {
  porId: new Map([
    ['item-react', { nome: 'React' }],
    ['area-ti', { nome: 'Tecnologia da Informação' }],
  ]),
};

const mockarCurriculo = ({ habilidades = [], formacoes = [], experiencias = [], certificacoes = [] } = {}) => ({
  habilidade: jest.spyOn(Habilidade, 'find').mockReturnValue(consulta(habilidades)),
  formacao: jest.spyOn(Formacao, 'find').mockReturnValue(consulta(formacoes)),
  experiencia: jest.spyOn(Experiencia, 'find').mockReturnValue(consulta(experiencias)),
  certificacao: jest.spyOn(Certificacao, 'find').mockReturnValue(consulta(certificacoes)),
});

const mockarQuestionario = ({
  questionario = null,
  respostaQuestionario = null,
  perguntas = [],
  respostasPergunta = [],
  opcoes = [],
  selecionadas = [],
} = {}) => ({
  questionario: jest.spyOn(Questionario, 'findOne').mockReturnValue(consulta(questionario)),
  respostaQuestionario: jest.spyOn(RespostaQuestionario, 'findOne').mockReturnValue(consulta(respostaQuestionario)),
  pergunta: jest.spyOn(Pergunta, 'find').mockReturnValue(consulta(perguntas)),
  respostaPergunta: jest.spyOn(RespostaPergunta, 'find').mockReturnValue(consulta(respostasPergunta)),
  opcao: jest.spyOn(OpcaoResposta, 'find').mockReturnValue(consulta(opcoes)),
  selecionada: jest.spyOn(RespostaOpcaoSelecionada, 'find').mockReturnValue(consulta(selecionadas)),
});

const opcao = (id, perguntaId, texto, ordem, correta = 0) => ({ id, perguntaId, texto, ordem, correta });

describe('AvaliacaoPayloadService', () => {
  let catalogoService;
  let service;

  beforeEach(() => {
    catalogoService = { carregarIndice: jest.fn().mockResolvedValue(indice) };
    service = new AvaliacaoPayloadService(catalogoService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('carregarVaga', () => {
    it('devolve o documento da vaga', async () => {
      const vaga = { _id: VAGA_ID, titulo: 'Dev React' };
      const findById = jest.spyOn(Vaga, 'findById').mockReturnValue(consulta(vaga));

      await expect(service.carregarVaga(VAGA_ID)).resolves.toBe(vaga);
      expect(findById).toHaveBeenCalledWith(VAGA_ID);
    });

    it('lança 404 quando a vaga não existe', async () => {
      jest.spyOn(Vaga, 'findById').mockReturnValue(consulta(null));

      const erro = await service.carregarVaga(VAGA_ID).catch((e) => e);

      expect(erro).toBeInstanceOf(AppError);
      expect(erro.message).toBe('Vaga não encontrada.');
      expect(erro.statusCode).toBe(404);
      expect(erro.code).toBe('NOT_FOUND');
    });

    it('trata id malformado como vaga inexistente', async () => {
      jest.spyOn(Vaga, 'findById').mockReturnValue(consultaQueFalha());

      await expect(service.carregarVaga('nao-e-objectid')).rejects.toMatchObject({
        message: 'Vaga não encontrada.',
        statusCode: 404,
      });
    });
  });

  describe('montarVaga', () => {
    const vagaBase = {
      titulo: 'Dev React',
      area: 'Tecnologia',
      descricao: 'Front-end',
      requisitos_gerais: 'Inglês técnico',
      status: 'ativa',
      recrutadorId: 'r1',
    };

    it('leva só os campos da vaga que a IA precisa', () => {
      const resultado = service.montarVaga({ ...vagaBase, criterio_vaga: [] }, indice);

      expect(resultado).toEqual({
        titulo: 'Dev React',
        area: 'Tecnologia',
        descricao: 'Front-end',
        requisitos_gerais: 'Inglês técnico',
        criterios: [],
      });
    });

    it('trata vaga sem criterio_vaga como lista vazia', () => {
      expect(service.montarVaga(vagaBase, indice).criterios).toEqual([]);
    });

    it('converte o id do critério em string e normaliza obrigatório e descrição', () => {
      const idObjeto = { toString: () => 'c1' };
      const [criterio] = service.montarVaga(
        {
          ...vagaBase,
          criterio_vaga: [{ _id: idObjeto, nome: 'Comunicação', tipo_criterio: 'soft_skill', peso_percentual: 30 }],
        },
        indice,
      ).criterios;

      expect(criterio).toEqual({
        id: 'c1',
        nome: 'Comunicação',
        tipo_criterio: 'soft_skill',
        peso_percentual: 30,
        obrigatorio: false,
        descricao: '',
      });
    });

    it('descreve em texto o requisito do critério obrigatório completo, sem ids do catálogo', () => {
      const [criterio] = service.montarVaga(
        {
          ...vagaBase,
          criterio_vaga: [
            {
              _id: 'c1',
              nome: 'React',
              tipo_criterio: 'skill_tecnica',
              peso_percentual: 50,
              obrigatorio: true,
              descricao: 'Experiência com hooks',
              requisito: { itemId: 'item-react', nivelMinimo: 'avancado' },
            },
          ],
        },
        indice,
      ).criterios;

      expect(criterio).toMatchObject({ obrigatorio: true, descricao: 'Experiência com hooks' });
      expect(criterio.requisito_texto).toBe('React, nivel minimo avancado');
      expect(criterio).not.toHaveProperty('requisito');
    });

    it('omite requisito_texto quando o critério não é obrigatório', () => {
      const [criterio] = service.montarVaga(
        {
          ...vagaBase,
          criterio_vaga: [
            { _id: 'c1', nome: 'React', tipo_criterio: 'skill_tecnica', obrigatorio: false, requisito: { itemId: 'item-react' } },
          ],
        },
        indice,
      ).criterios;

      expect(criterio).not.toHaveProperty('requisito_texto');
    });

    it('omite requisito_texto quando o obrigatório não tem requisito', () => {
      const [criterio] = service.montarVaga(
        { ...vagaBase, criterio_vaga: [{ _id: 'c1', nome: 'React', tipo_criterio: 'skill_tecnica', obrigatorio: true }] },
        indice,
      ).criterios;

      expect(criterio).not.toHaveProperty('requisito_texto');
    });

    it('omite requisito_texto quando o requisito está incompleto', () => {
      const [criterio] = service.montarVaga(
        {
          ...vagaBase,
          criterio_vaga: [
            { _id: 'c1', nome: 'Graduação', tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'inexistente' } },
          ],
        },
        indice,
      ).criterios;

      expect(criterio).not.toHaveProperty('requisito_texto');
    });
  });

  describe('montarCurriculo', () => {
    it('busca as quatro seções do perfil do usuário', async () => {
      const spies = mockarCurriculo();

      await service.montarCurriculo(USUARIO_ID);

      for (const spy of Object.values(spies)) {
        expect(spy).toHaveBeenCalledWith({ usuarioId: USUARIO_ID });
      }
    });

    it('envia só os campos de conteúdo, sem ids nem metadados', async () => {
      mockarCurriculo({
        habilidades: [{ _id: 'h1', usuarioId: USUARIO_ID, habilidade: 'React', nivel: 'avancado', itemId: 'item-react' }],
        experiencias: [
          {
            _id: 'e1',
            usuarioId: USUARIO_ID,
            cargo: 'Dev',
            empresa: 'ACME',
            descricaoAtivida_: 'Front-end',
            mesesDuracao: 24,
            areaId: 'area-ti',
          },
        ],
        certificacoes: [{ _id: 'ce1', nome: 'AWS CCP', emissor: 'AWS', itemId: 'item-aws' }],
      });

      const curriculo = await service.montarCurriculo(USUARIO_ID);

      expect(curriculo.habilidades).toEqual([{ habilidade: 'React', nivel: 'avancado' }]);
      expect(curriculo.experiencias).toEqual([
        { cargo: 'Dev', empresa: 'ACME', descricaoAtivida_: 'Front-end', mesesDuracao: 24 },
      ]);
      expect(curriculo.certificacoes).toEqual([{ nome: 'AWS CCP', emissor: 'AWS' }]);
    });

    it('chama de previsaoConclusao o ano de quem ainda está cursando', async () => {
      mockarCurriculo({
        formacoes: [
          { curso: 'ADS', grau: 'graduacao', instituicao: 'Fatec', situacao: 'cursando', anoInicio: 2024, anoConclusao: 2027 },
          { curso: 'Técnico', grau: 'tecnico', instituicao: 'Etec', situacao: 'concluido', anoInicio: 2020, anoConclusao: 2022 },
        ],
      });

      const { formacoes } = await service.montarCurriculo(USUARIO_ID);

      expect(formacoes[0]).toEqual({
        curso: 'ADS',
        grau: 'graduacao',
        instituicao: 'Fatec',
        situacao: 'cursando',
        anoInicio: 2024,
        previsaoConclusao: 2027,
      });
      expect(formacoes[0]).not.toHaveProperty('anoConclusao');
      expect(formacoes[1]).toMatchObject({ anoConclusao: 2022 });
      expect(formacoes[1]).not.toHaveProperty('previsaoConclusao');
    });

    it('usa null quando o ano de conclusão não foi informado', async () => {
      mockarCurriculo({
        formacoes: [
          { curso: 'ADS', situacao: 'cursando' },
          { curso: 'SI', situacao: 'trancado' },
        ],
      });

      const { formacoes } = await service.montarCurriculo(USUARIO_ID);

      expect(formacoes[0].previsaoConclusao).toBeNull();
      expect(formacoes[1].anoConclusao).toBeNull();
    });
  });

  describe('aferirObjetiva', () => {
    const multipla = { tipoResposta: 'multipla_escolha' };
    const certa = opcao('o1', 'p1', 'Certa', 1, 1);
    const errada = opcao('o2', 'p1', 'Errada', 2, 0);

    it('não acrescenta nada à pergunta dissertativa', () => {
      expect(service.aferirObjetiva({ tipoResposta: 'dissertativa' }, [certa], [certa])).toEqual({});
    });

    it('marca acerto quando todas as opções marcadas são corretas', () => {
      expect(service.aferirObjetiva(multipla, [certa, errada], [certa])).toEqual({
        opcoesDisponiveis: ['Certa', 'Errada'],
        gabarito: ['Certa'],
        acertou: true,
      });
    });

    it('marca erro quando alguma opção marcada é incorreta', () => {
      expect(service.aferirObjetiva(multipla, [certa, errada], [certa, errada]).acertou).toBe(false);
    });

    it('marca erro quando nenhuma opção foi marcada', () => {
      expect(service.aferirObjetiva(multipla, [certa, errada], []).acertou).toBe(false);
    });

    it('devolve acertou null quando a pergunta não tem gabarito', () => {
      const semGabarito = [opcao('o1', 'p1', 'A', 1), opcao('o2', 'p1', 'B', 2)];

      expect(service.aferirObjetiva(multipla, semGabarito, [semGabarito[0]])).toEqual({
        opcoesDisponiveis: ['A', 'B'],
        gabarito: [],
        acertou: null,
      });
    });

    it('afere verdadeiro ou falso pelo mesmo gabarito', () => {
      const verdadeiro = opcao('v', 'p1', 'Verdadeiro', 1, 0);
      const falso = opcao('f', 'p1', 'Falso', 2, 1);

      expect(service.aferirObjetiva({ tipoResposta: 'verdadeiro_falso' }, [verdadeiro, falso], [verdadeiro])).toEqual({
        opcoesDisponiveis: ['Verdadeiro', 'Falso'],
        gabarito: ['Falso'],
        acertou: false,
      });
    });

    it('considera correta só a opção com correta igual a 1', () => {
      const comTrue = { ...certa, correta: true };

      expect(service.aferirObjetiva(multipla, [comTrue], [comTrue])).toMatchObject({ gabarito: [], acertou: null });
    });
  });

  describe('montarQuestionario', () => {
    it('devolve questionário vazio quando a vaga não tem questionário ativo', async () => {
      const { questionario, respostaQuestionario } = mockarQuestionario();

      await expect(service.montarQuestionario(USUARIO_ID, VAGA_ID)).resolves.toEqual({ titulo: null, respostas: [] });
      expect(questionario).toHaveBeenCalledWith({ vagaId: VAGA_ID, ativo: 1 });
      expect(respostaQuestionario).not.toHaveBeenCalled();
    });

    it('devolve só o título quando o candidato não finalizou o questionário', async () => {
      const { respostaQuestionario, pergunta } = mockarQuestionario({ questionario: { id: 'q1', titulo: 'Triagem' } });

      await expect(service.montarQuestionario(USUARIO_ID, VAGA_ID)).resolves.toEqual({ titulo: 'Triagem', respostas: [] });
      expect(respostaQuestionario).toHaveBeenCalledWith({ questionarioId: 'q1', usuarioId: USUARIO_ID, status: 'finalizado' });
      expect(pergunta).not.toHaveBeenCalled();
    });

    it('monta as respostas na ordem das perguntas, com gabarito nas objetivas', async () => {
      const spies = mockarQuestionario({
        questionario: { id: 'q1', titulo: 'Triagem' },
        respostaQuestionario: { id: 'rq1' },
        perguntas: [
          { id: 'p1', enunciado: 'Fale de você', tipoResposta: 'dissertativa', ordem: 1 },
          { id: 'p2', enunciado: 'Qual hook guarda estado?', tipoResposta: 'multipla_escolha', ordem: 2 },
          { id: 'p3', enunciado: 'Pergunta não respondida', tipoResposta: 'dissertativa', ordem: 3 },
        ],
        respostasPergunta: [
          { id: 'rp2', perguntaId: 'p2', textoResposta: '' },
          { id: 'rp1', perguntaId: 'p1', textoResposta: 'Sou dev.' },
        ],
        opcoes: [
          opcao('o3', 'p2', 'useEffect', 3),
          opcao('o1', 'p2', 'useState', 1, 1),
          opcao('o2', 'p2', 'useMemo', 2),
        ],
        selecionadas: [{ respostaPergunta_: 'rp2', opcaoRespostaId: 'o1' }],
      });

      const resultado = await service.montarQuestionario(USUARIO_ID, VAGA_ID);

      expect(spies.pergunta).toHaveBeenCalledWith({ questionarioId: 'q1' });
      expect(spies.respostaPergunta).toHaveBeenCalledWith({ respostaQuestionId: 'rq1' });
      expect(spies.opcao).toHaveBeenCalledWith({ perguntaId: { $in: ['p1', 'p2', 'p3'] } });
      expect(spies.selecionada).toHaveBeenCalledWith({ respostaPergunta_: { $in: ['rp2', 'rp1'] } });
      expect(resultado).toEqual({
        titulo: 'Triagem',
        respostas: [
          {
            perguntaId: 'p1',
            enunciado: 'Fale de você',
            tipoResposta: 'dissertativa',
            textoResposta: 'Sou dev.',
            opcoesSelecionadas: [],
          },
          {
            perguntaId: 'p2',
            enunciado: 'Qual hook guarda estado?',
            tipoResposta: 'multipla_escolha',
            textoResposta: '',
            opcoesSelecionadas: ['useState'],
            opcoesDisponiveis: ['useState', 'useMemo', 'useEffect'],
            gabarito: ['useState'],
            acertou: true,
          },
        ],
      });
    });

    it('ordena as perguntas pelo campo ordem na consulta', async () => {
      const { pergunta } = mockarQuestionario({
        questionario: { id: 'q1', titulo: 'Triagem' },
        respostaQuestionario: { id: 'rq1' },
      });

      await service.montarQuestionario(USUARIO_ID, VAGA_ID);

      expect(pergunta.mock.results[0].value.sort).toHaveBeenCalledWith({ ordem: 1 });
    });

    it('ignora opção selecionada que não existe mais e usa texto vazio quando não há resposta escrita', async () => {
      mockarQuestionario({
        questionario: { id: 'q1', titulo: 'Triagem' },
        respostaQuestionario: { id: 'rq1' },
        perguntas: [{ id: 'p1', enunciado: 'Escolha', tipoResposta: 'multipla_escolha', ordem: 1 }],
        respostasPergunta: [{ id: 'rp1', perguntaId: 'p1' }],
        opcoes: [opcao('o1', 'p1', 'A', 1, 1)],
        selecionadas: [
          { respostaPergunta_: 'rp1', opcaoRespostaId: 'apagada' },
          { respostaPergunta_: 'rp1', opcaoRespostaId: 'o1' },
        ],
      });

      const { respostas } = await service.montarQuestionario(USUARIO_ID, VAGA_ID);

      expect(respostas[0]).toMatchObject({ textoResposta: '', opcoesSelecionadas: ['A'], acertou: true });
    });
  });

  describe('montarVerificacao', () => {
    it('reúne critérios e perfil com os ids do catálogo para o gate', async () => {
      mockarCurriculo({
        habilidades: [{ habilidade: 'React', nivel: 'avancado', itemId: 'item-react' }, { habilidade: 'Vue', nivel: 'basico' }],
        formacoes: [{ curso: 'ADS', grau: 'graduacao', situacao: 'cursando', areaId: 'area-ti', instituicao: 'Fatec' }],
        experiencias: [{ cargo: 'Dev', mesesDuracao: 12, empresa: 'ACME' }],
        certificacoes: [{ nome: 'AWS CCP', itemId: 'item-aws', emissor: 'AWS' }],
      });
      const vaga = {
        criterio_vaga: [
          { _id: 'c1', nome: 'React', tipo_criterio: 'skill_tecnica', obrigatorio: 1, requisito: { itemId: 'item-react' }, peso_percentual: 50 },
          { _id: 'c2', nome: 'Comunicação', tipo_criterio: 'soft_skill', peso_percentual: 50 },
        ],
      };

      const verificacao = await service.montarVerificacao(vaga, USUARIO_ID, indice);

      expect(verificacao).toEqual({
        indice,
        criterios: [
          { nome: 'React', tipo_criterio: 'skill_tecnica', obrigatorio: true, requisito: { itemId: 'item-react' } },
          { nome: 'Comunicação', tipo_criterio: 'soft_skill', obrigatorio: false, requisito: null },
        ],
        curriculo: {
          habilidades: [
            { habilidade: 'React', nivel: 'avancado', itemId: 'item-react' },
            { habilidade: 'Vue', nivel: 'basico', itemId: null },
          ],
          formacoes: [{ curso: 'ADS', grau: 'graduacao', situacao: 'cursando', areaId: 'area-ti' }],
          experiencias: [{ cargo: 'Dev', mesesDuracao: 12, areaId: null }],
          certificacoes: [{ nome: 'AWS CCP', itemId: 'item-aws' }],
        },
      });
    });

    it('trata vaga sem criterio_vaga como lista vazia', async () => {
      mockarCurriculo();

      const verificacao = await service.montarVerificacao({}, USUARIO_ID, indice);

      expect(verificacao.criterios).toEqual([]);
    });
  });

  describe('montar', () => {
    it('monta o payload completo com a data de referência em AAAA-MM-DD', async () => {
      const vagaDoc = {
        titulo: 'Dev React',
        area: 'Tecnologia',
        descricao: 'Front-end',
        requisitos_gerais: '',
        criterio_vaga: [{ _id: 'c1', nome: 'React', tipo_criterio: 'skill_tecnica', peso_percentual: 100 }],
      };
      jest.spyOn(Vaga, 'findById').mockReturnValue(consulta(vagaDoc));
      mockarCurriculo({ habilidades: [{ habilidade: 'React', nivel: 'avancado', itemId: 'item-react' }] });
      mockarQuestionario();

      const payload = await service.montar(USUARIO_ID, VAGA_ID, new Date('2026-11-02T15:30:00Z'));

      expect(catalogoService.carregarIndice).toHaveBeenCalledTimes(1);
      expect(payload.dataReferencia).toBe('2026-11-02');
      expect(payload.vaga).toEqual(service.montarVaga(vagaDoc, indice));
      expect(payload.curriculo.habilidades).toEqual([{ habilidade: 'React', nivel: 'avancado' }]);
      expect(payload.questionario).toEqual({ titulo: null, respostas: [] });
      expect(payload.verificacao.indice).toBe(indice);
      expect(payload.verificacao.curriculo.habilidades[0].itemId).toBe('item-react');
    });

    it('não carrega o catálogo quando a vaga não existe', async () => {
      jest.spyOn(Vaga, 'findById').mockReturnValue(consulta(null));

      await expect(service.montar(USUARIO_ID, VAGA_ID)).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      expect(catalogoService.carregarIndice).not.toHaveBeenCalled();
    });
  });
});

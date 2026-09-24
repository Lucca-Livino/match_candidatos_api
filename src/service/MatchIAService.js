import { criarProvider } from './match/criarProvider.js';
import { novaCascata, degrauAtual, descer, acabou, trilha } from './match/cascataModelos.js';
import { ErroDeIARecuperavel } from '../utils/helpers/errosIA.js';
import AppError from '../utils/helpers/AppError.js';

// Context do Strategy E despachante da Chain of Responsibility.
//
// Como Context: usa uma estrategia de avaliacao sem conhecer qual e. Nao ha
// nenhum `if (provedor === ...)` aqui, e e esse o ponto. Tambem nao ha nenhum
// `error.status` nem nenhuma leitura do JSON bruto: a estrategia entrega um
// resultado ja valido ou um erro do dominio, e esta classe so escolhe o degrau.
//
// Como despachante: percorre os degraus da cascata em ordem e desce apenas na
// condicao certa:
//
//   para cada degrau (modelo):
//       provider.gerarAvaliacao(modelo)     <- retry e traducao la dentro
//       ErroDeIARecuperavel -> desce um degrau
//       qualquer outro erro -> aborta, NAO desce
//
// A estrategia pode ser injetada pelo construtor (testes, script de
// calibracao da Task 18) ou resolvida pela fabrica a partir da configuracao.
class MatchIAService {
  constructor(provider = null) {
    this.provider = provider;
  }

  resolverProvider(nome) {
    return this.provider || criarProvider(nome);
  }

  // `cascata` e a lista ordenada de modelos vinda da ConfiguracaoIntegracao.
  // Devolve tambem `modeloUsado`: sem ele, dois scores gravados no mesmo dia
  // poderiam ter vindo de modelos diferentes e nada no banco diria qual —
  // exatamente o tipo de variavel escondida que invalida comparacao.
  async avaliar(payload, { provedor, cascata, temperatura }) {
    const provider = this.resolverProvider(provedor);
    let estado = novaCascata(cascata);

    while (!acabou(estado)) {
      const modelo = degrauAtual(estado);

      try {
        const resultado = await provider.gerarAvaliacao(payload, { modelo, temperatura });
        return { ...resultado, modeloUsado: modelo, degrausEsgotados: estado.esgotados };
      } catch (error) {
        // Recuperavel: cota diaria, tentativas esgotadas no degrau ou resposta
        // fora do contrato. O proximo modelo pode responder.
        if (error instanceof ErroDeIARecuperavel) {
          estado = descer(estado, error.motivo);
          continue;
        }

        // Permanente ou inesperado (bug na estrategia): abortar preserva a
        // causa real em vez de diluir em "todos os modelos falharam".
        throw new AppError('Avaliacao por IA indisponivel.', 503, 'AI_UNAVAILABLE', {
          causa: error.message,
          motivo: error.motivo ?? 'erro nao tratado pela estrategia',
          modelo,
        });
      }
    }

    // Nenhum degrau respondeu. A trilha vai junto: e o que responde "a rodada
    // parou por cota ou por defeito?"
    throw new AppError('Avaliacao por IA indisponivel.', 503, 'AI_UNAVAILABLE', {
      causa: 'cascata esgotada',
      trilha: trilha(estado),
    });
  }
}

export default MatchIAService;

import { criarProvider } from './match/criarProvider.js';
import { novaCascata, degrauAtual, descer, acabou, trilha } from './match/cascataModelos.js';
import { ErroDeCotaDiaria } from '../utils/helpers/comRetry.js';
import { classificarErroIA } from '../utils/helpers/classificarErroIA.js';
import AppError from '../utils/helpers/AppError.js';

// Context do Strategy E despachante da Chain of Responsibility.
//
// Como Context: usa uma estrategia de avaliacao sem conhecer qual e. Nao ha
// nenhum `if (provedor === ...)` aqui, e e esse o ponto.
//
// Como despachante: percorre os degraus da cascata em ordem e desce apenas na
// condicao certa. As duas defesas sao aninhadas, e a ordem importa:
//
//   para cada degrau (modelo):
//       comRetry( provider.gerarAvaliacao(modelo) )   <- backoff resolve RPM
//       ErroDeCotaDiaria  -> desce um degrau           <- cascata resolve RPD
//       erro deterministico -> aborta, NAO desce
//
// Inverter isso — trocar de modelo no primeiro 429 — desperdicaria o degrau
// principal por um bloqueio que passaria em 1,5 s, e queimaria a reserva cedo.
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

  validarResultado(resultado) {
    const score = Number(resultado?.score);
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new AppError('Avaliacao por IA indisponivel.', 503, 'AI_UNAVAILABLE', {
        causa: 'score_invalido',
      });
    }
    if (!Array.isArray(resultado.criterios)) {
      throw new AppError('Avaliacao por IA indisponivel.', 503, 'AI_UNAVAILABLE', {
        causa: 'criterios_invalidos',
      });
    }
    return {
      score,
      criterios: resultado.criterios,
      resumo: String(resultado.resumo || ''),
    };
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
        const bruto = await provider.gerarAvaliacao(payload, { modelo, temperatura });
        return {
          ...this.validarResultado(bruto),
          modeloUsado: modelo,
          degrausEsgotados: estado.esgotados,
        };
      } catch (error) {
        // Cota diaria
        if (error instanceof ErroDeCotaDiaria) {
          estado = descer(estado, error.message);
          continue;
        }

        const { acao, motivo } = classificarErroIA(error);

        // Erro deterministico (400, 401, 403, 404): vai falhar igual no
        // proximo modelo. Descer transformaria "o schema esta errado" em
        // "todos os modelos falharam" e gastaria a cascata inteira por um
        // erro de configuracao.
        if (acao === 'desistir') {
          throw new AppError('Avaliacao por IA indisponivel.', 503, 'AI_UNAVAILABLE', {
            causa: error.message,
            motivo,
            modelo,
          });
        }

        // Repeticoes esgotadas no degrau (o comRetry ja esperou o que tinha
        // para esperar) ou JSON invalido: vale tentar o proximo modelo.
        estado = descer(estado, motivo ?? error.message);
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

import AppError from '../../utils/helpers/AppError.js';

// Strategy (GoF). Declara o unico metodo que toda estrategia de avaliacao
// cumpre. JavaScript nao tem interface: esta classe e a forma de tornar o
// contrato explicito no codigo, e o erro abaixo e o que o denuncia se um
// provedor novo esquecer de implementa-lo.
class AvaliacaoProvider {
  // Identificador usado na fabrica, na configuracao e no campo
  // `versaoModelo` gravado na Candidatura (rastreabilidade da avaliacao).
  get nome() {
    throw new AppError(
      `${this.constructor.name}: getter 'nome' nao implementado.`,
      500,
      'AI_PROVIDER_INVALID',
    );
  }

  // Recebe o payload consolidado e devolve o objeto ja parseado
  // ({ score, criterios, resumo }). Erros sobem crus: normalizar e
  // responsabilidade do Context (MatchIAService), nao da estrategia.
  // eslint-disable-next-line no-unused-vars
  async gerarAvaliacao(payload, { modelo, temperatura }) {
    throw new AppError(
      `${this.constructor.name}: gerarAvaliacao nao implementado.`,
      500,
      'AI_PROVIDER_INVALID',
    );
  }
}

export default AvaliacaoProvider;

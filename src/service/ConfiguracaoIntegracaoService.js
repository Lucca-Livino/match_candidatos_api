import ConfiguracaoIntegracaoRepository from '../repository/ConfiguracaoIntegracaoRepository.js';
import { validateUpdateConfiguracao } from '../utils/validators/configuracaoValidators.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class ConfiguracaoIntegracaoService {
  constructor(repository = new ConfiguracaoIntegracaoRepository()) {
    this.repository = repository;
  }

  // As chaves de API vivem apenas em variavel de ambiente. Aqui expomos
  // somente o status booleano por provedor — nunca o valor. O formato segue
  // sendo um mapa, com um provedor so: e o que permite acrescentar outro sem
  // quebrar o contrato do front.
  decorarComStatusDasChaves(config) {
    return {
      ...sanitizeDoc(config),
      chavesConfiguradas: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
      },
    };
  }

  async obter() {
    const config = await this.repository.obterOuCriar();
    return this.decorarComStatusDasChaves(config);
  }

  async atualizar(payload, atualizadoPor) {
    const validado = validateUpdateConfiguracao(payload);
    const atualizada = await this.repository.atualizar(validado, atualizadoPor);
    return this.decorarComStatusDasChaves(atualizada);
  }
}

export default ConfiguracaoIntegracaoService;

import ConfiguracaoIntegracao from '../models/ConfiguracaoIntegracao.js';

class ConfiguracaoIntegracaoRepository {
  async obterOuCriar() {
    const existente = await ConfiguracaoIntegracao.findOne().lean();
    if (existente) return existente;

    const criada = await ConfiguracaoIntegracao.create({});
    return criada.toObject();
  }

  async atualizar(payload, atualizadoPor) {
    const atual = await this.obterOuCriar();
    return ConfiguracaoIntegracao.findOneAndUpdate(
      { id: atual.id },
      { ...payload, atualizadoPor },
      { returnDocument: 'after', runValidators: true },
    ).lean();
  }
}

export default ConfiguracaoIntegracaoRepository;

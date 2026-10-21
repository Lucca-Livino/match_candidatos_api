
class ErroDeIA extends Error {
  constructor(mensagem, { causa = null, modelo = null, motivo = null } = {}) {
    super(mensagem);
    this.name = this.constructor.name;
    this.causa = causa;
    this.modelo = modelo;
    this.motivo = motivo ?? mensagem;
  }
}

class ErroDeIAPermanente extends ErroDeIA {}

class ErroDeIARecuperavel extends ErroDeIA {}

class ErroDeCotaDiaria extends ErroDeIARecuperavel {
  constructor(causa, modelo = null) {
    super(`cota diaria esgotada${modelo ? ` no modelo ${modelo}` : ''}`, {
      causa,
      modelo,
      motivo: 'cota diaria (RPD) esgotada',
    });
  }
}

class ErroDeRespostaInvalida extends ErroDeIARecuperavel {}

export {
  ErroDeIA,
  ErroDeIAPermanente,
  ErroDeIARecuperavel,
  ErroDeCotaDiaria,
  ErroDeRespostaInvalida,
};

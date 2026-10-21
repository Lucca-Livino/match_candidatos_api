// Score global da triagem, calculado em codigo a partir das notas que o
// modelo deu a cada criterio:
//
//   score = soma(aderencia x peso_percentual) / soma(peso_percentual)
//
// Divide pela soma real dos pesos, e nao por 100, porque a vaga pode ter
// pesos que somam menos que 100.
//
// O criterio da vaga e casado com o da resposta pelo id (criterioId). Um
// criterio que o modelo omitiu entra com aderencia 0: a rubrica manda dar 0
// quando nao ha evidencia, e tratar a omissao de outro jeito premiaria uma
// resposta incompleta. Criterios da resposta que nao existem na vaga sao
// ignorados.

const CASAS = 4;

const arredondar = (valor) => Math.round(valor * 10 ** CASAS) / 10 ** CASAS;

// Se o modelo repetir um criterio, vale a primeira nota.
const notasPorId = (criteriosAvaliados) => {
  const porId = new Map();
  criteriosAvaliados.forEach((c) => {
    const id = String(c.criterioId);
    if (!porId.has(id)) porId.set(id, c);
  });
  return porId;
};

export const calcularScore = (criteriosVaga = [], criteriosAvaliados = []) => {
  const notaPorId = notasPorId(criteriosAvaliados);

  const itens = criteriosVaga.map((c) => ({
    peso: Number(c.peso_percentual) || 0,
    aderencia: Number(notaPorId.get(String(c.id))?.aderencia) || 0,
  }));

  if (itens.length === 0) return 0;

  const somaPesos = itens.reduce((soma, i) => soma + i.peso, 0);

  // Vaga sem nenhum peso definido: todos os criterios valem o mesmo.
  if (somaPesos === 0) {
    return arredondar(itens.reduce((soma, i) => soma + i.aderencia, 0) / itens.length);
  }

  return arredondar(itens.reduce((soma, i) => soma + i.aderencia * i.peso, 0) / somaPesos);
};

// Registro de auditoria da nota por criterio, com o mesmo casamento por id do
// score: e a evidencia de por que a candidatura ficou acima ou abaixo do
// limiar. Nome e peso sao copiados da vaga porque o recrutador pode edita-la
// depois, e o registro precisa mostrar o que valia quando a nota foi dada.
export const detalharCriterios = (criteriosVaga = [], criteriosAvaliados = []) => {
  const notaPorId = notasPorId(criteriosAvaliados);

  return criteriosVaga.map((c) => {
    const nota = notaPorId.get(String(c.id));
    return {
      criterioId: String(c.id),
      nome: c.nome,
      peso: Number(c.peso_percentual) || 0,
      obrigatorio: Boolean(c.obrigatorio),
      aderencia: Number(nota?.aderencia) || 0,
      evidencia: nota ? String(nota.evidencia ?? '') : '',
      atendido: Boolean(nota?.atendido),
      omitido: !nota,
    };
  });
};

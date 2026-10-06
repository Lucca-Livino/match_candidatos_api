// Serie temporal dos relatorios. Tudo em UTC: no fuso local (UTC-3) uma
// inscricao de domingo a noite cairia na semana seguinte.
const DIA_MS = 24 * 60 * 60 * 1000;

export const PERIODOS = ['30d', '90d', '12m', 'tudo'];

export function inicioDoPeriodo(periodo, agora = new Date()) {
  switch (periodo) {
    case '30d':
      return new Date(agora.getTime() - 30 * DIA_MS);
    case '90d':
      return new Date(agora.getTime() - 90 * DIA_MS);
    case '12m': {
      const inicio = new Date(agora);
      inicio.setUTCMonth(inicio.getUTCMonth() - 12);
      return inicio;
    }
    default:
      return null;
  }
}

export const granularidadeDo = (periodo) => (periodo === '30d' || periodo === '90d' ? 'semana' : 'mes');

// Semana comeca na segunda; mes no dia 1.
function alinhar(data, granularidade) {
  const dia = granularidade === 'mes' ? 1 : data.getUTCDate();
  const alinhada = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), dia));
  if (granularidade === 'semana') {
    alinhada.setUTCDate(alinhada.getUTCDate() - ((alinhada.getUTCDay() + 6) % 7));
  }
  return alinhada;
}

function avancar(data, granularidade) {
  const proxima = new Date(data);
  if (granularidade === 'semana') proxima.setUTCDate(proxima.getUTCDate() + 7);
  else proxima.setUTCMonth(proxima.getUTCMonth() + 1);
  return proxima;
}

const chave = (data) => data.toISOString().slice(0, 10);

// Serie continua: um ponto por semana/mes do inicio ate agora, com zero onde
// nao houve inscricao, para o grafico nao pular datas.
export function montarSerie(datas, granularidade, inicio, agora = new Date()) {
  const origem = inicio ?? datas.reduce((maisAntiga, data) => (maisAntiga && maisAntiga <= data ? maisAntiga : data), null);
  if (!origem) return { granularidade, pontos: [] };

  const contagem = new Map();
  for (const data of datas) {
    const k = chave(alinhar(data, granularidade));
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }

  const fim = alinhar(agora, granularidade);
  const pontos = [];
  for (let atual = alinhar(origem, granularidade); atual <= fim; atual = avancar(atual, granularidade)) {
    const k = chave(atual);
    pontos.push({ inicio: k, total: contagem.get(k) ?? 0 });
  }

  return { granularidade, pontos };
}

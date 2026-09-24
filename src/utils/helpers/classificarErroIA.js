const STATUS_REPETIVEIS = [429, 500, 502, 503, 504];

export const statusDoErro = (erro) => {
  if (!erro || typeof erro !== 'object') return null;
  if (Number.isInteger(erro.status)) return erro.status;
  if (Number.isInteger(erro.statusCode)) return erro.statusCode;
  if (Number.isInteger(erro.code)) return erro.code;
  if (Number.isInteger(erro.response?.status)) return erro.response.status;
  if (Number.isInteger(erro.error?.code)) return erro.error.code;

  const achado = String(erro.message ?? '').match(/\b(4\d{2}|5\d{2})\b/);
  return achado ? Number(achado[1]) : null;
};


const CODIGOS_DE_REDE = /^(ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|ENETUNREACH|EHOSTUNREACH|UND_ERR_\w+)$/;
const MENSAGENS_DE_REDE = /fetch failed|socket hang up|network|timed? ?out/i;

// Sem status HTTP, so e transitorio o que tem cara de rede. Um TypeError de
// bug tambem chega sem status; repeti-lo gastaria o backoff inteiro e depois
// desceria a cascata, escondendo o defeito atras de "modelo indisponivel".
const ehFalhaDeRede = (erro) => {
  if (!erro || typeof erro !== 'object') return false;
  if (['AbortError', 'TimeoutError'].includes(erro.name)) return true;
  const codigos = [erro.code, erro.cause?.code].filter((c) => typeof c === 'string');
  if (codigos.some((c) => CODIGOS_DE_REDE.test(c))) return true;
  return MENSAGENS_DE_REDE.test(String(erro.message ?? ''));
};

const ehCotaDiaria = (erro) => {
  const texto = JSON.stringify({
    message: erro?.message ?? '',
    details: erro?.error?.details ?? erro?.details ?? null,
  });
  return /per\s*day|PerDay|RequestsPerDay/i.test(texto);
};


const atrasoSugerido = (erro) => {
  const bruto = JSON.stringify(erro?.error?.details ?? erro?.details ?? erro?.message ?? '').replace(
    /\\/g,
    '',
  );
  const achado = bruto.match(/retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s/i);
  return achado ? Math.round(Number(achado[1]) * 1000) : null;
};


export const classificarErroIA = (erro) => {
  const status = statusDoErro(erro);
  const atrasoSugeridoMs = atrasoSugerido(erro);

  if (status === 429 && ehCotaDiaria(erro)) {
    return { status, acao: 'escalar', motivo: 'cota diaria (RPD) esgotada', atrasoSugeridoMs };
  }
  if (status === null) {
    return ehFalhaDeRede(erro)
      ? { status, acao: 'repetir', motivo: 'falha de rede sem status', atrasoSugeridoMs }
      : { status, acao: 'desistir', motivo: 'erro sem status (provavel defeito)', atrasoSugeridoMs };
  }
  if (STATUS_REPETIVEIS.includes(status)) {
    return {
      status,
      acao: 'repetir',
      motivo: status === 429 ? 'limite de taxa (RPM)' : 'erro transitorio do servidor',
      atrasoSugeridoMs,
    };
  }
  return { status, acao: 'desistir', motivo: 'erro deterministico', atrasoSugeridoMs };
};

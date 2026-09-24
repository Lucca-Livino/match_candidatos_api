import { TIPOS_PERMISSAO } from '../../models/Usuario.js';
import AppError from '../helpers/AppError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Contato do perfil: opcional em toda rota, guardado como string ja aparada.
// O limite espelha o `maxlength` do model — validar aqui devolve 400 com a
// causa, em vez de deixar o Mongoose lancar ValidationError na gravacao.
const CAMPOS_CONTATO = [
  ['telefone', 20],
  ['cidade', 120],
];

const LINKEDIN_MAX_LENGTH = 255;

// O campo existe para virar um link clicavel no perfil. Guardar "maria-silva"
// ou "meu linkedin" deixaria a tela com um href que nao abre nada, e o defeito
// so apareceria quando alguem clicasse — por isso a forma e exigida na entrada.
//
// Aceita o que as pessoas realmente copiam: com ou sem `https://`, com `www.`,
// com prefixo de pais (`br.linkedin.com`) e com os parametros de rastreio que
// o proprio LinkedIn gruda no "copiar link". Guarda sempre a forma canonica,
// para que dois cadastros do mesmo perfil nao virem strings diferentes.
const LINKEDIN_REGEX =
  /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9\-_%]{3,100})\/?(?:\?.*)?$/i;

const normalizeLinkedin = (valorBruto) => {
  const valor = String(valorBruto ?? '').trim();

  // Vazio e "nao informado": o campo continua opcional e limpavel por PATCH.
  if (valor === '') {
    return '';
  }

  if (valor.length > LINKEDIN_MAX_LENGTH) {
    throw new AppError(
      `linkedin deve ter no maximo ${LINKEDIN_MAX_LENGTH} caracteres.`,
      400,
      'VALIDATION_ERROR',
    );
  }

  const achado = valor.match(LINKEDIN_REGEX);
  if (!achado) {
    throw new AppError(
      'linkedin deve ser o endereco de um perfil, no formato https://www.linkedin.com/in/seu-perfil.',
      400,
      'VALIDATION_ERROR',
      { exemplo: 'https://www.linkedin.com/in/maria-silva' },
    );
  }

  return `https://www.linkedin.com/in/${achado[1]}`;
};

const normalizeContato = (payload, destino) => {
  for (const [campo, limite] of CAMPOS_CONTATO) {
    if (!Object.hasOwn(payload, campo)) {
      continue;
    }

    const valor = String(payload[campo] ?? '').trim();
    if (valor.length > limite) {
      throw new AppError(
        `${campo} deve ter no maximo ${limite} caracteres.`,
        400,
        'VALIDATION_ERROR',
      );
    }

    destino[campo] = valor;
  }

  if (Object.hasOwn(payload, 'linkedin')) {
    destino.linkedin = normalizeLinkedin(payload.linkedin);
  }

  return destino;
};

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};

export const normalizeRoles = (roles) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new AppError('tipos_permissao deve ser um array nao vazio.', 400, 'VALIDATION_ERROR');
  }

  const normalized = [...new Set(roles.map((role) => String(role).trim().toLowerCase()))];
  const invalid = normalized.filter((role) => !TIPOS_PERMISSAO.includes(role));

  if (invalid.length > 0) {
    throw new AppError(
      `Papeis invalidos: ${invalid.join(', ')}.`,
      400,
      'VALIDATION_ERROR',
      { allowed: TIPOS_PERMISSAO },
    );
  }

  return normalized;
};

export const validateCreateUsuario = (payload) => {
  ensureObject(payload);

  const nome = String(payload.nome || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const senha = String(payload.senha || '').trim();
  const status_ativo = payload.status_ativo;

  if (nome.length < 2) {
    throw new AppError('nome e obrigatorio e deve ter ao menos 2 caracteres.', 400, 'VALIDATION_ERROR');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError('email invalido.', 400, 'VALIDATION_ERROR');
  }

  if (senha.length < MIN_PASSWORD_LENGTH) {
    throw new AppError('senha e obrigatoria e deve ter ao menos 8 caracteres.', 400, 'VALIDATION_ERROR');
  }

  if (typeof status_ativo !== 'undefined' && typeof status_ativo !== 'boolean') {
    throw new AppError('status_ativo deve ser booleano.', 400, 'VALIDATION_ERROR');
  }

  return normalizeContato(payload, {
    nome,
    email,
    senha,
    tipos_permissao: normalizeRoles(payload.tipos_permissao),
    status_ativo: typeof status_ativo === 'boolean' ? status_ativo : true,
  });
};

export const validatePatchUsuario = (payload) => {
  ensureObject(payload);

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  const normalized = {};

  if (Object.hasOwn(payload, 'nome')) {
    const nome = String(payload.nome || '').trim();
    if (nome.length < 2) {
      throw new AppError('nome deve ter ao menos 2 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.nome = nome;
  }

  if (Object.hasOwn(payload, 'email')) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('email invalido.', 400, 'VALIDATION_ERROR');
    }
    normalized.email = email;
  }

  if (Object.hasOwn(payload, 'tipos_permissao')) {
    normalized.tipos_permissao = normalizeRoles(payload.tipos_permissao);
  }

  if (Object.hasOwn(payload, 'status_ativo')) {
    if (typeof payload.status_ativo !== 'boolean') {
      throw new AppError('status_ativo deve ser booleano.', 400, 'VALIDATION_ERROR');
    }
    normalized.status_ativo = payload.status_ativo;
  }

  if (Object.hasOwn(payload, 'senha')) {
    const senha = String(payload.senha || '').trim();
    if (senha.length < MIN_PASSWORD_LENGTH) {
      throw new AppError('senha deve ter ao menos 8 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.senha = senha;
  }

  normalizeContato(payload, normalized);

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Nenhum campo valido foi informado para atualizacao.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateListQuery = (query = {}) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit,
    email: query.email ? String(query.email).trim() : undefined,
    nome: query.nome ? String(query.nome).trim() : undefined,
    status_ativo:
      typeof query.status_ativo === 'string'
        ? query.status_ativo.toLowerCase() === 'true'
          ? true
          : query.status_ativo.toLowerCase() === 'false'
            ? false
            : undefined
        : undefined,
  };
};

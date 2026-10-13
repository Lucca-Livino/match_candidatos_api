import { TIPOS_CATALOGO } from '../../models/ItemCatalogo.js';
import AppError from '../helpers/AppError.js';
import { normalizarChave } from '../helpers/normalizarChave.js';

const erro = (mensagem, details) => new AppError(mensagem, 400, 'VALIDATION_ERROR', details);

const ensureObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw erro('Payload inválido.');
};

// Sinonimos cuja chave fica vazia (so pontuacao) sao descartados; implica
// guarda ids e mantem so o filtro de vazio.
const lista = (valor, campo) => {
  if (typeof valor === 'undefined') return [];
  if (!Array.isArray(valor)) throw erro(`${campo} deve ser uma lista.`);
  const itens = valor.map((v) => String(v ?? '').trim()).filter(Boolean);
  return campo === 'sinonimos' ? itens.filter((v) => normalizarChave(v)) : [...new Set(itens)];
};

const tipoValido = (tipo) => {
  const t = String(tipo || '').trim();
  if (!TIPOS_CATALOGO.includes(t)) throw erro('tipo inválido.', { allowed: TIPOS_CATALOGO });
  return t;
};

const nomeValido = (nome) => {
  const n = String(nome || '').trim();
  if (!n) throw erro('nome é obrigatório.');
  if (!normalizarChave(n)) throw erro('nome precisa ter letras ou números.');
  if (n.length > 120) throw erro('nome deve ter no máximo 120 caracteres.');
  return n;
};

export const validateCreateItemCatalogo = (payload) => {
  ensureObject(payload);
  return {
    tipo: tipoValido(payload.tipo),
    nome: nomeValido(payload.nome),
    sinonimos: lista(payload.sinonimos, 'sinonimos'),
    implica: lista(payload.implica, 'implica'),
  };
};

export const validateUpdateItemCatalogo = (payload) => {
  ensureObject(payload);
  if (Object.hasOwn(payload, 'tipo')) throw erro('tipo não pode ser alterado.');

  const normalized = {};
  if (Object.hasOwn(payload, 'nome')) normalized.nome = nomeValido(payload.nome);
  if (Object.hasOwn(payload, 'sinonimos')) normalized.sinonimos = lista(payload.sinonimos, 'sinonimos');
  if (Object.hasOwn(payload, 'implica')) normalized.implica = lista(payload.implica, 'implica');
  if (Object.hasOwn(payload, 'ativo')) {
    if (typeof payload.ativo !== 'boolean') throw erro('ativo deve ser booleano.');
    normalized.ativo = payload.ativo;
  }
  if (Object.keys(normalized).length === 0) throw erro('Informe ao menos um campo para atualizar.');
  return normalized;
};

export const validateBuscaCatalogo = (query = {}) => {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
  return {
    tipo: tipoValido(query.tipo),
    q: String(query.q || '').trim(),
    limit,
    todos: String(query.todos || '').trim().toLowerCase() === 'true',
  };
};

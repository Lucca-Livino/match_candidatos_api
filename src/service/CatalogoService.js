import CatalogoRepository from '../repository/CatalogoRepository.js';
import { calcularChaves } from '../models/ItemCatalogo.js';
import { montarIndice } from '../utils/helpers/indiceCatalogo.js';
import { normalizarChave } from '../utils/helpers/normalizarChave.js';
import AppError from '../utils/helpers/AppError.js';

const semInternos = ({ _id, __v, ...resto }) => resto;

class CatalogoService {
  constructor(repository = new CatalogoRepository()) {
    this.repository = repository;
  }

  async buscar({ tipo, q, limit }) {
    const itens = await this.repository.buscarAtivos({ tipo, prefixo: normalizarChave(q), limit });
    return itens.map(semInternos);
  }

  // Sem limite nem filtro de ativo: o administrador precisa ver o que saiu do
  // autocomplete para poder reativar.
  async listarPorTipo(tipo) {
    const itens = await this.repository.listarPorTipo(tipo);
    return itens.map(semInternos);
  }

  async validarImplica(tipo, implica, idProprio) {
    if (idProprio && implica.includes(idProprio)) {
      throw new AppError('implica não pode conter o próprio item.', 400, 'VALIDATION_ERROR');
    }
    if (implica.length === 0) return;
    const encontrados = await this.repository.buscarPorIds(implica);
    if (encontrados.length !== new Set(implica).size || encontrados.some((i) => i.tipo !== tipo)) {
      throw new AppError('implica aponta para item inexistente ou de outro tipo.', 400, 'VALIDATION_ERROR');
    }
  }

  traduzirDuplicado(error) {
    if (error?.code === 11000) {
      return new AppError('Nome ou sinônimo já usado por outro item deste tipo.', 409, 'CONFLICT');
    }
    return error;
  }

  async criar(payload) {
    await this.validarImplica(payload.tipo, payload.implica, null);
    try {
      const criado = await this.repository.criar(payload);
      return semInternos(criado.toObject());
    } catch (error) {
      throw this.traduzirDuplicado(error);
    }
  }

  async atualizar(id, payload) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) throw new AppError('Item do catálogo não encontrado.', 404, 'NOT_FOUND');

    if (payload.implica) await this.validarImplica(atual.tipo, payload.implica, id);

    // findOneAndUpdate nao roda o pre('validate'): as chaves sao recalculadas aqui.
    const dados = { ...payload };
    if (payload.nome || payload.sinonimos) {
      dados.chaves = calcularChaves(payload.nome ?? atual.nome, payload.sinonimos ?? atual.sinonimos);
    }

    try {
      const atualizado = await this.repository.atualizar(id, dados);
      if (!atualizado) throw new AppError('Item do catálogo não encontrado.', 404, 'NOT_FOUND');
      return semInternos(atualizado);
    } catch (error) {
      throw this.traduzirDuplicado(error);
    }
  }

  // Todos os itens, inclusive inativos: uma vaga antiga pode exigir um item
  // que ja saiu do autocomplete e continua valendo.
  async carregarIndice() {
    return montarIndice(await this.repository.listarTodos());
  }

  // refs: [{ tipo, id, campo }]. Recusa id inexistente ou de outro tipo.
  async garantirReferencias(refs = []) {
    const validas = refs.filter((r) => r.id);
    if (validas.length === 0) return;
    const itens = await this.repository.buscarPorIds([...new Set(validas.map((r) => r.id))]);
    const porId = new Map(itens.map((i) => [i.id, i]));
    for (const ref of validas) {
      if (porId.get(ref.id)?.tipo !== ref.tipo) {
        throw new AppError(
          `${ref.campo} não corresponde a item do catálogo do tipo ${ref.tipo}.`,
          400,
          'VALIDATION_ERROR',
        );
      }
    }
  }
}

export default CatalogoService;

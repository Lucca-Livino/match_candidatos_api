import mongoose from 'mongoose';
import Formacao from '../models/Formacao.js';
import Experiencia from '../models/Experiencia.js';
import Habilidade from '../models/Habilidade.js';
import Certificacao from '../models/Certificacao.js';

const COLLECTION_SESSAO = 'session';
const COLLECTION_CREDENCIAL = 'account';

const MODELOS_CURRICULO = [Formacao, Experiencia, Habilidade, Certificacao];

function variacoesDeId(usuarioId) {
  const comoTexto = String(usuarioId);
  const valores = [comoTexto];

  if (mongoose.Types.ObjectId.isValid(comoTexto)) {
    valores.push(new mongoose.Types.ObjectId(comoTexto));
  }

  return valores;
}

class ExclusaoContaRepository {
  constructor(connection = mongoose.connection) {
    this.connection = connection;
  }

  // Remove o curriculo inteiro do usuario.
  async removerCurriculo(usuarioId) {
    const id = String(usuarioId);
    const resultados = await Promise.all(
      MODELOS_CURRICULO.map((modelo) => modelo.deleteMany({ usuarioId: id })),
    );

    return resultados.reduce((total, r) => total + (r?.deletedCount ?? 0), 0);
  }

  // Derruba a sessao ativa e apaga a credencial de login. 
  async revogarAcesso(usuarioId) {
    const filtro = { userId: { $in: variacoesDeId(usuarioId) } };
    const db = this.connection.db;

    const [sessoes, credenciais] = await Promise.all([
      db.collection(COLLECTION_SESSAO).deleteMany(filtro),
      db.collection(COLLECTION_CREDENCIAL).deleteMany(filtro),
    ]);

    return {
      sessoesRevogadas: sessoes?.deletedCount ?? 0,
      credenciaisRemovidas: credenciais?.deletedCount ?? 0,
    };
  }
}

export default ExclusaoContaRepository;

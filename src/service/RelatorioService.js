import Candidatura, { STATUS_CANDIDATURA } from '../models/Candidatura.js';
import Vaga, { STATUS_VAGA } from '../models/Vaga.js';
import Usuario from '../models/Usuario.js';
import { inicioDoPeriodo, granularidadeDo, montarSerie } from '../utils/helpers/serieTemporal.js';
import AppError from '../utils/helpers/AppError.js';

// Candidatura guarda usuarioId como string. So ids no formato de ObjectId vao
// para o $in: qualquer outro valor faria o Mongoose lancar CastError.
const ehObjectId = (valor) => /^[a-f\d]{24}$/i.test(String(valor));

const zerado = (chaves) => Object.fromEntries(chaves.map((chave) => [chave, 0]));

// Relatorios do recrutador. So agrega status e datas: nenhum campo da triagem
// (score, veredito, justificativa) sai daqui — esses dados sao do suporte.
class RelatorioService {
  constructor({ candidaturaModel = Candidatura, vagaModel = Vaga, usuarioModel = Usuario } = {}) {
    this.Candidatura = candidaturaModel;
    this.Vaga = vagaModel;
    this.Usuario = usuarioModel;
  }

  contarPor(model, filtro, campo) {
    return model.aggregate([{ $match: filtro }, { $group: { _id: `$${campo}`, total: { $sum: 1 } } }]);
  }

  async resumirCandidaturas(filtro) {
    const grupos = await this.contarPor(this.Candidatura, filtro, 'status');
    const porStatus = zerado(STATUS_CANDIDATURA);
    for (const { _id, total } of grupos) {
      if (_id in porStatus) porStatus[_id] = total;
    }

    const total = Object.values(porStatus).reduce((soma, n) => soma + n, 0);
    const decididas = porStatus.aprovado + porStatus.reprovado;

    return {
      total,
      porStatus,
      // null e nao 0: sem decisao nenhuma, "0% de aprovacao" seria falso.
      taxaAprovacao: decididas > 0 ? porStatus.aprovado / decididas : null,
    };
  }

  async geral(periodo, agora = new Date()) {
    const inicio = inicioDoPeriodo(periodo, agora);
    const filtroCandidatura = inicio ? { criadoEm: { $gte: inicio } } : {};
    // Vaga usa `timestamps: true`, entao a data de criacao e `createdAt`.
    const filtroVaga = inicio ? { createdAt: { $gte: inicio } } : {};

    const [statusVagas, areasVagas, candidaturas, datas] = await Promise.all([
      this.contarPor(this.Vaga, filtroVaga, 'status'),
      this.contarPor(this.Vaga, filtroVaga, 'area'),
      this.resumirCandidaturas(filtroCandidatura),
      this.Candidatura.find(filtroCandidatura, 'criadoEm').lean(),
    ]);

    const porStatus = zerado(STATUS_VAGA);
    for (const { _id, total } of statusVagas) {
      if (_id in porStatus) porStatus[_id] = total;
    }

    const porArea = areasVagas
      .map(({ _id, total }) => ({ area: _id, total }))
      .sort((a, b) => b.total - a.total || a.area.localeCompare(b.area));

    return {
      periodo,
      geradoEm: agora.toISOString(),
      vagas: {
        total: statusVagas.reduce((soma, { total }) => soma + total, 0),
        porStatus,
        porArea,
      },
      candidaturas,
      serie: montarSerie(datas.map((d) => d.criadoEm), granularidadeDo(periodo), inicio, agora),
    };
  }

  async porVaga(vagaId, periodo, agora = new Date()) {
    const vaga = ehObjectId(vagaId) ? await this.Vaga.findById(vagaId).lean() : null;
    if (!vaga) {
      throw new AppError('Vaga nao encontrada.', 404, 'NOT_FOUND');
    }

    const inicio = inicioDoPeriodo(periodo, agora);
    const filtro = { vagaId: String(vaga._id), ...(inicio ? { criadoEm: { $gte: inicio } } : {}) };

    const [candidaturas, lista] = await Promise.all([
      this.resumirCandidaturas(filtro),
      this.Candidatura.find(filtro, 'usuarioId status criadoEm').lean(),
    ]);

    const ids = [...new Set(lista.map((c) => String(c.usuarioId)))].filter(ehObjectId);
    const usuarios = await this.Usuario.find({ _id: { $in: ids } }, 'nome').lean();
    const nomePorId = new Map(usuarios.map((u) => [String(u._id), u.nome]));

    const etapa = (status) => STATUS_CANDIDATURA.indexOf(status);
    const candidatos = lista
      .map((c) => ({
        // null: o usuario foi removido; o front mostra "Candidato removido".
        nome: nomePorId.get(String(c.usuarioId)) ?? null,
        status: c.status,
        inscritoEm: c.criadoEm,
      }))
      .sort((a, b) => etapa(a.status) - etapa(b.status) || a.inscritoEm - b.inscritoEm);

    return {
      periodo,
      geradoEm: agora.toISOString(),
      vaga: {
        id: String(vaga._id),
        titulo: vaga.titulo,
        area: vaga.area,
        status: vaga.status,
        criadoEm: vaga.createdAt ?? null,
      },
      candidaturas,
      serie: montarSerie(lista.map((c) => c.criadoEm), granularidadeDo(periodo), inicio, agora),
      candidatos,
    };
  }
}

export default RelatorioService;

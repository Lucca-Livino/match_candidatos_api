import Certificacao from '../models/Certificacao.js';

class CertificacaoRepository {
	async criar(payload) {
		return Certificacao.create(payload);
	}

	async listarPorCandidatoId(candidatoId) {
		return Certificacao.find({ candidatoId }).sort({ dataEmissao: -1 }).lean();
	}

	async buscarPorCandidatoEId(candidatoId, id) {
		return Certificacao.findOne({ candidatoId, id }).lean();
	}

	async buscarPorId(id) {
		return Certificacao.findOne({ id }).lean();
	}

	async atualizarPorCandidatoEId(candidatoId, id, payload) {
		return Certificacao.findOneAndUpdate({ candidatoId, id }, payload, {
			returnDocument: 'after',
			runValidators: true,
		}).lean();
	}

	async deletarPorCandidatoEId(candidatoId, id) {
		return Certificacao.findOneAndDelete({ candidatoId, id }).lean();
	}
}

export default CertificacaoRepository;

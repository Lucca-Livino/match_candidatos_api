import CandidatoVaga from '../models/CandidatoVaga.js';

class CandidaturaRepository {
	async criar(payload) {
		return CandidatoVaga.create(payload);
	}

	async listarPorCandidatoId(candidatoId) {
		return CandidatoVaga.find({ candidatoId }).sort({ criadoEm: -1 }).lean();
	}

	async buscarPorCandidatoEVaga(candidatoId, vagaId) {
		return CandidatoVaga.findOne({ candidatoId, vagaId }).lean();
	}

	async buscarPorId(id) {
		return CandidatoVaga.findOne({ id }).lean();
	}

	async atualizarPorCandidatoEVaga(candidatoId, vagaId, payload) {
		return CandidatoVaga.findOneAndUpdate({ candidatoId, vagaId }, payload, {
			returnDocument: 'after',
			runValidators: true,
		}).lean();
	}

	async deletarPorCandidatoEVaga(candidatoId, vagaId) {
		return CandidatoVaga.findOneAndDelete({ candidatoId, vagaId }).lean();
	}
}

export default CandidaturaRepository;

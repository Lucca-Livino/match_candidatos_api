import Habilidade from '../models/Habilidade.js';

class HabilidadeRepository {
	async criar(payload) {
		return Habilidade.create(payload);
	}

	async listarPorCandidatoId(candidatoId) {
		return Habilidade.find({ candidatoId }).sort({ habilidade: 1 }).lean();
	}

	async buscarPorCandidatoEId(candidatoId, id) {
		return Habilidade.findOne({ candidatoId, id }).lean();
	}

	async buscarPorId(id) {
		return Habilidade.findOne({ id }).lean();
	}

	async atualizarPorCandidatoEId(candidatoId, id, payload) {
		return Habilidade.findOneAndUpdate({ candidatoId, id }, payload, {
			returnDocument: 'after',
			runValidators: true,
		}).lean();
	}

	async deletarPorCandidatoEId(candidatoId, id) {
		return Habilidade.findOneAndDelete({ candidatoId, id }).lean();
	}
}

export default HabilidadeRepository;

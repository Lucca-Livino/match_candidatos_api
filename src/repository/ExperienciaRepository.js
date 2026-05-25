import Experiencia from '../models/Experiencia.js';

class ExperienciaRepository {
	async criar(payload) {
		return Experiencia.create(payload);
	}

	async listarPorCandidatoId(candidatoId) {
		return Experiencia.find({ candidatoId }).sort({ dataInicio: -1 }).lean();
	}

	async buscarPorCandidatoEId(candidatoId, id) {
		return Experiencia.findOne({ candidatoId, id }).lean();
	}

	async buscarPorId(id) {
		return Experiencia.findOne({ id }).lean();
	}

	async atualizarPorCandidatoEId(candidatoId, id, payload) {
		return Experiencia.findOneAndUpdate({ candidatoId, id }, payload, {
			returnDocument: 'after',
			runValidators: true,
		}).lean();
	}

	async deletarPorCandidatoEId(candidatoId, id) {
		return Experiencia.findOneAndDelete({ candidatoId, id }).lean();
	}
}

export default ExperienciaRepository;

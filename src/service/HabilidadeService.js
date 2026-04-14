import CandidatoRepository from '../repository/CandidatoRepository.js';
import HabilidadeRepository from '../repository/HabilidadeRepository.js';
import AppError from '../utils/helpers/AppError.js';

class HabilidadeService {
	constructor(
		habilidadeRepository = new HabilidadeRepository(),
		candidatoRepository = new CandidatoRepository(),
	) {
		this.habilidadeRepository = habilidadeRepository;
		this.candidatoRepository = candidatoRepository;
	}

	sanitize(doc) {
		if (!doc) {
			return null;
		}

		const sanitized = { ...doc };
		delete sanitized.__v;
		return sanitized;
	}

	async garantirCandidatoExiste(candidatoId) {
		const candidato = await this.candidatoRepository.buscarCandidatoPorId(candidatoId);
		if (!candidato) {
			throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
		}

		return candidato;
	}

	async criarHabilidade(candidatoId, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const created = await this.habilidadeRepository.criar({
			...payload,
			candidatoId,
		});

		return this.sanitize(created.toObject());
	}

	async listarHabilidade(candidatoId) {
		await this.garantirCandidatoExiste(candidatoId);

		const list = await this.habilidadeRepository.listarPorCandidatoId(candidatoId);
		return list.map((item) => this.sanitize(item));
	}

	async atualizarHabilidade(candidatoId, id, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const existente = await this.habilidadeRepository.buscarPorCandidatoEId(candidatoId, id);
		if (!existente) {
			throw new AppError('Habilidade nao encontrada.', 404, 'NOT_FOUND');
		}

		const updated = await this.habilidadeRepository.atualizarPorCandidatoEId(candidatoId, id, payload);
		return this.sanitize(updated);
	}

	async deletarHabilidade(candidatoId, id) {
		await this.garantirCandidatoExiste(candidatoId);

		const removed = await this.habilidadeRepository.deletarPorCandidatoEId(candidatoId, id);
		if (!removed) {
			throw new AppError('Habilidade nao encontrada.', 404, 'NOT_FOUND');
		}

		return {
			id,
			deletado: true,
		};
	}
}

export default HabilidadeService;

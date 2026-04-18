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
		const candidato = await this.candidatoRepository.buscarCandidatoPorIdOuUsuarioId(candidatoId);
		if (!candidato) {
			throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
		}

		return candidato;
	}

	async resolverCandidatoId(candidatoId) {
		const candidato = await this.garantirCandidatoExiste(candidatoId);
		return candidato.id;
	}

	async criarHabilidade(candidatoId, payload) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const created = await this.habilidadeRepository.criar({
			...payload,
			candidatoId: candidatoIdResolvido,
		});

		return this.sanitize(created.toObject());
	}

	async listarHabilidade(candidatoId) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const list = await this.habilidadeRepository.listarPorCandidatoId(candidatoIdResolvido);
		return list.map((item) => this.sanitize(item));
	}

	async atualizarHabilidade(candidatoId, id, payload) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const existente = await this.habilidadeRepository.buscarPorCandidatoEId(candidatoIdResolvido, id);
		if (!existente) {
			throw new AppError('Habilidade nao encontrada.', 404, 'NOT_FOUND');
		}

		const updated = await this.habilidadeRepository.atualizarPorCandidatoEId(candidatoIdResolvido, id, payload);
		return this.sanitize(updated);
	}

	async deletarHabilidade(candidatoId, id) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const removed = await this.habilidadeRepository.deletarPorCandidatoEId(candidatoIdResolvido, id);
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

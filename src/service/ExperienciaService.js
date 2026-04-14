import CandidatoRepository from '../repository/CandidatoRepository.js';
import ExperienciaRepository from '../repository/ExperienciaRepository.js';
import AppError from '../utils/helpers/AppError.js';

class ExperienciaService {
	constructor(
		experienciaRepository = new ExperienciaRepository(),
		candidatoRepository = new CandidatoRepository(),
	) {
		this.experienciaRepository = experienciaRepository;
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

	calcularMesesDuracao(dataInicio, dataFim) {
		const inicio = new Date(dataInicio);
		const fim = dataFim ? new Date(dataFim) : new Date();

		if (fim < inicio) {
			throw new AppError('dataFim nao pode ser anterior a dataInicio.', 400, 'VALIDATION_ERROR');
		}

		let meses = (fim.getFullYear() - inicio.getFullYear()) * 12;
		meses += fim.getMonth() - inicio.getMonth();

		if (fim.getDate() < inicio.getDate()) {
			meses -= 1;
		}

		return Math.max(0, meses);
	}

	async garantirCandidatoExiste(candidatoId) {
		const candidato = await this.candidatoRepository.buscarCandidatoPorId(candidatoId);
		if (!candidato) {
			throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
		}

		return candidato;
	}

	async criarExperiencia(candidatoId, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const mesesDuracao = this.calcularMesesDuracao(payload.dataInicio, payload.dataFim);

		const created = await this.experienciaRepository.criar({
			...payload,
			candidatoId,
			mesesDuracao,
		});

		return this.sanitize(created.toObject());
	}

	async listarExperiencia(candidatoId) {
		await this.garantirCandidatoExiste(candidatoId);

		const list = await this.experienciaRepository.listarPorCandidatoId(candidatoId);
		return list.map((item) => this.sanitize(item));
	}

	async atualizarExperiencia(candidatoId, id, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const existente = await this.experienciaRepository.buscarPorCandidatoEId(candidatoId, id);
		if (!existente) {
			throw new AppError('Experiencia nao encontrada.', 404, 'NOT_FOUND');
		}

		const dataInicio = payload.dataInicio || existente.dataInicio;
		const dataFim = Object.hasOwn(payload, 'dataFim') ? payload.dataFim : existente.dataFim;

		const mesesDuracao = this.calcularMesesDuracao(dataInicio, dataFim);

		const updated = await this.experienciaRepository.atualizarPorCandidatoEId(candidatoId, id, {
			...payload,
			mesesDuracao,
		});

		return this.sanitize(updated);
	}

	async deletarExperiencia(candidatoId, id) {
		await this.garantirCandidatoExiste(candidatoId);

		const removed = await this.experienciaRepository.deletarPorCandidatoEId(candidatoId, id);
		if (!removed) {
			throw new AppError('Experiencia nao encontrada.', 404, 'NOT_FOUND');
		}

		return {
			id,
			deletado: true,
		};
	}
}

export default ExperienciaService;

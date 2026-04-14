import CandidatoRepository from '../repository/CandidatoRepository.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AppError from '../utils/helpers/AppError.js';

class CandidaturaService {
	constructor(
		candidaturaRepository = new CandidaturaRepository(),
		candidatoRepository = new CandidatoRepository(),
	) {
		this.candidaturaRepository = candidaturaRepository;
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

	validarTransicaoStatus(statusAtual, novoStatus) {
		const fluxo = {
			inscrito: ['em_analise'],
			em_analise: ['aprovado', 'reprovado'],
			aprovado: [],
			reprovado: [],
		};

		const permitidos = fluxo[statusAtual] || [];
		if (!permitidos.includes(novoStatus)) {
			throw new AppError(
				`Transicao de status invalida: ${statusAtual} -> ${novoStatus}.`,
				400,
				'BUSINESS_RULE_ERROR',
			);
		}
	}

	async garantirCandidatoExiste(candidatoId) {
		const candidato = await this.candidatoRepository.buscarCandidatoPorId(candidatoId);
		if (!candidato) {
			throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
		}

		return candidato;
	}

	async criarCandidatura(candidatoId, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const jaExiste = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoId, payload.vagaId);
		if (jaExiste) {
			throw new AppError('Candidato ja esta inscrito nesta vaga.', 409, 'CONFLICT');
		}

		const created = await this.candidaturaRepository.criar({
			...payload,
			candidatoId,
			status: 'inscrito',
		});

		return this.sanitize(created.toObject());
	}

	async listarCandidatura(candidatoId) {
		await this.garantirCandidatoExiste(candidatoId);

		const list = await this.candidaturaRepository.listarPorCandidatoId(candidatoId);
		return list.map((item) => this.sanitize(item));
	}

	async detalharCandidatura(candidatoId, vagaId) {
		await this.garantirCandidatoExiste(candidatoId);

		const candidatura = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoId, vagaId);
		if (!candidatura) {
			throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
		}

		const scores = await this.candidaturaRepository.listarScorePorCandidatura(candidatura.id);

		const scoreTotal = scores.reduce((acc, item) => acc + Number(item.scoreObtido || 0), 0);
		const scoreMaximoTotal = scores.reduce((acc, item) => acc + Number(item.scoreMaximo || 0), 0);

		return {
			...this.sanitize(candidatura),
			score: {
				scoreTotal,
				scoreMaximoTotal,
			},
		};
	}

	async atualizarStatusCandidatura(candidatoId, vagaId, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const candidatura = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoId, vagaId);
		if (!candidatura) {
			throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
		}

		this.validarTransicaoStatus(candidatura.status, payload.status);

		const updated = await this.candidaturaRepository.atualizarPorCandidatoEVaga(
			candidatoId,
			vagaId,
			payload,
		);
		return this.sanitize(updated);
	}

	async cancelarCandidatura(candidatoId, vagaId) {
		await this.garantirCandidatoExiste(candidatoId);

		const candidatura = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoId, vagaId);
		if (!candidatura) {
			throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
		}

		if (!['inscrito', 'em_analise'].includes(candidatura.status)) {
			throw new AppError(
				'Cancelamento permitido apenas para candidaturas inscrito ou em_analise.',
				400,
				'BUSINESS_RULE_ERROR',
			);
		}

		await this.candidaturaRepository.deletarPorCandidatoEVaga(candidatoId, vagaId);

		return {
			vagaId,
			cancelada: true,
		};
	}
}

export default CandidaturaService;

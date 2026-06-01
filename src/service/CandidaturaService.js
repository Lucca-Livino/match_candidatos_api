import CandidatoRepository from '../repository/CandidatoRepository.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class CandidaturaService {
	constructor(
		candidaturaRepository = new CandidaturaRepository(),
		candidatoRepository = new CandidatoRepository(),
	) {
		this.candidaturaRepository = candidaturaRepository;
		this.candidatoRepository = candidatoRepository;
	}

	sanitize(doc) {
		return sanitizeDoc(doc);
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

	async criarCandidatura(candidatoId, payload) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const jaExiste = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoIdResolvido, payload.vagaId);
		if (jaExiste) {
			throw new AppError('Candidato ja esta inscrito nesta vaga.', 409, 'CONFLICT');
		}

		const created = await this.candidaturaRepository.criar({
			...payload,
			candidatoId: candidatoIdResolvido,
			status: 'inscrito',
		});

		return this.sanitize(created.toObject());
	}

	async listarCandidatura(candidatoId) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const list = await this.candidaturaRepository.listarPorCandidatoId(candidatoIdResolvido);
		return list.map((item) => this.sanitize(item));
	}

	async detalharCandidatura(candidatoId, vagaId) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const candidatura = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoIdResolvido, vagaId);
		if (!candidatura) {
			throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
		}

		return this.sanitize(candidatura);
	}

	async atualizarStatusCandidatura(candidatoId, vagaId, payload) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const candidatura = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoIdResolvido, vagaId);
		if (!candidatura) {
			throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
		}

		this.validarTransicaoStatus(candidatura.status, payload.status);

		const updated = await this.candidaturaRepository.atualizarPorCandidatoEVaga(
			candidatoIdResolvido,
			vagaId,
			payload,
		);
		return this.sanitize(updated);
	}

	async cancelarCandidatura(candidatoId, vagaId) {
		const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

		const candidatura = await this.candidaturaRepository.buscarPorCandidatoEVaga(candidatoIdResolvido, vagaId);
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

		await this.candidaturaRepository.deletarPorCandidatoEVaga(candidatoIdResolvido, vagaId);

		return {
			vagaId,
			cancelada: true,
		};
	}
}

export default CandidaturaService;

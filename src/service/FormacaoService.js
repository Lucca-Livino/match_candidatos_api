import CandidatoRepository from '../repository/CandidatoRepository.js';
import FormacaoRepository from '../repository/FormacaoRepository.js';
import AppError from '../utils/helpers/AppError.js';

class FormacaoService {
	constructor(
		formacaoRepository = new FormacaoRepository(),
		candidatoRepository = new CandidatoRepository(),
	) {
		this.formacaoRepository = formacaoRepository;
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

	async criarFormacao(candidatoId, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const created = await this.formacaoRepository.criar({
			...payload,
			candidatoId,
		});

		return this.sanitize(created.toObject());
	}

	async listarFormacao(candidatoId) {
		await this.garantirCandidatoExiste(candidatoId);

		const list = await this.formacaoRepository.listarPorCandidatoId(candidatoId);
		return list.map((item) => this.sanitize(item));
	}

	async atualizarFormacao(candidatoId, id, payload) {
		await this.garantirCandidatoExiste(candidatoId);

		const existente = await this.formacaoRepository.buscarPorCandidatoEId(candidatoId, id);
		if (!existente) {
			throw new AppError('Formacao nao encontrada.', 404, 'NOT_FOUND');
		}

		const anoInicio = payload.anoInicio ?? existente.anoInicio;
		const anoConclusao = Object.hasOwn(payload, 'anoConclusao') ? payload.anoConclusao : existente.anoConclusao;

		if (Number.isInteger(anoConclusao) && anoConclusao < anoInicio) {
			throw new AppError('anoConclusao nao pode ser menor que anoInicio.', 400, 'VALIDATION_ERROR');
		}

		const updated = await this.formacaoRepository.atualizarPorCandidatoEId(candidatoId, id, payload);
		return this.sanitize(updated);
	}

	async deletarFormacao(candidatoId, id) {
		await this.garantirCandidatoExiste(candidatoId);

		const removed = await this.formacaoRepository.deletarPorCandidatoEId(candidatoId, id);
		if (!removed) {
			throw new AppError('Formacao nao encontrada.', 404, 'NOT_FOUND');
		}

		return {
			id,
			deletado: true,
		};
	}
}

export default FormacaoService;

import Certificacao from '../models/Certificacao.js';

class CertificacaoRepository {
	async criar(payload) {
		return Certificacao.create(payload);
	}

	async listarPorId(Id) {
		return Certificacao.find({ Id }).sort({ dataEmissao: -1 }).lean();
	}

	async buscarPorEId(Id, id) {
		return Certificacao.findOne({ Id, id }).lean();
	}

	async buscarPorId(id) {
		return Certificacao.findOne({ id }).lean();
	}

	async atualizarPorEId(Id, id, payload) {
		return Certificacao.findOneAndUpdate({ Id, id }, payload, {
			returnDocument: 'after',
			runValidators: true,
		}).lean();
	}

	async deletarPorEId(Id, id) {
		return Certificacao.findOneAndDelete({ Id, id }).lean();
	}
}

export default CertificacaoRepository;

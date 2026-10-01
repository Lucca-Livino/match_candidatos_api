import express from 'express';
import VagaController from '../controller/VagaController.js';
import CandidaturaController from '../controller/CandidaturaController.js';
import RelatorioController from '../controller/RelatorioController.js';

const router = express.Router();
const vagaController = new VagaController();
const candidaturaController = new CandidaturaController();
const relatorioController = new RelatorioController();

router.get('/vagas', (req, res, next) => {
  vagaController.listar(req, res).catch(next);
});

// Relatorios antes de '/vagas/:id', que trataria 'relatorio' como id.
router.get('/vagas/relatorio', (req, res, next) => relatorioController.geral(req, res, next));

router.get('/vagas/:id/relatorio', (req, res, next) => relatorioController.porVaga(req, res, next));

// Rotas mais especificas primeiro: '/vagas/:id' casaria com o prefixo destas.
router.get('/vagas/:id/candidaturas', (req, res, next) =>
  candidaturaController.listarPorVaga(req, res, next),
);

router.post('/vagas/:id/candidaturas/:usuarioId/reavaliar', (req, res, next) =>
  candidaturaController.reavaliarCandidatura(req, res, next),
);

router.get('/vagas/:id/candidaturas/:usuarioId/ficha', (req, res, next) =>
  candidaturaController.montarFicha(req, res, next),
);

router.get('/vagas/:id', (req, res, next) => {
  vagaController.listarPorId(req, res).catch(next);
});

router.post('/vagas', (req, res, next) => {
  vagaController.criar(req, res).catch(next);
});

router.patch('/vagas/:id', (req, res, next) => {
  vagaController.atualizar(req, res).catch(next);
});

router.delete('/vagas/:id', (req, res, next) => {
  vagaController.deletar(req, res).catch(next);
});

export default router;

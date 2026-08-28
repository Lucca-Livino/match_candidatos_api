import express from 'express';
import VagaController from '../controller/VagaController.js';
import CandidaturaController from '../controller/CandidaturaController.js';

const router = express.Router();
const vagaController = new VagaController();
const candidaturaController = new CandidaturaController();

router.get('/vagas', (req, res, next) => {
  vagaController.listar(req, res).catch(next);
});

// Rotas mais especificas primeiro: '/vagas/:id' casaria com o prefixo destas.
router.get('/vagas/:id/candidaturas', (req, res, next) =>
  candidaturaController.listarPorVaga(req, res, next),
);

router.post('/vagas/:id/candidaturas/:usuarioId/reavaliar', (req, res, next) =>
  candidaturaController.reavaliarCandidatura(req, res, next),
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

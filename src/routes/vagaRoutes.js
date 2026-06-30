import express from 'express';
import VagaController from '../controller/VagaController.js';

const router = express.Router();
const vagaController = new VagaController();

router.get('/vagas', (req, res, next) => {
  vagaController.listar(req, res).catch(next);
});

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

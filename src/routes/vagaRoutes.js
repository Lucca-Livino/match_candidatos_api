import express from 'express';
import VagaController from '../controller/VagaController.js';
import { requireAbility } from '../middlewares/requireAbility.js';

const router = express.Router();
const vagaController = new VagaController();

// CANDIDATO e RECRUTADOR podem listar vagas
router.get('/vagas', requireAbility('read', 'Vaga'), (req, res, next) => {
  vagaController.listar(req, res).catch(next);
});

// CANDIDATO e RECRUTADOR podem ver detalhes de uma vaga
router.get('/vagas/:id', requireAbility('read', 'Vaga'), (req, res, next) => {
  vagaController.listarPorId(req, res).catch(next);
});

// Apenas RECRUTADOR e ADMINISTRADOR podem criar vagas
router.post('/vagas', requireAbility('create', 'Vaga'), (req, res, next) => {
  vagaController.criar(req, res).catch(next);
});

// Apenas RECRUTADOR e ADMINISTRADOR podem atualizar vagas
router.patch('/vagas/:id', requireAbility('update', 'Vaga'), (req, res, next) => {
  vagaController.atualizar(req, res).catch(next);
});

// Apenas RECRUTADOR e ADMINISTRADOR podem deletar vagas
router.delete('/vagas/:id', requireAbility('delete', 'Vaga'), (req, res, next) => {
  vagaController.deletar(req, res).catch(next);
});

export default router;
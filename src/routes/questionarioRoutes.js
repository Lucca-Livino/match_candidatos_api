import express from 'express';
import QuestionarioController from '../controller/QuestionarioController.js';

const router = express.Router();
const questionarioController = new QuestionarioController();

router.post('/questionario', (req, res, next) => questionarioController.criar(req, res, next));
router.get('/questionario', (req, res, next) => questionarioController.listar(req, res, next));
router.get('/questionario/:id', (req, res, next) => questionarioController.buscarPorId(req, res, next));
router.put('/questionario/:id', (req, res, next) => questionarioController.atualizar(req, res, next));
router.patch('/questionario/:id/ativo', (req, res, next) => questionarioController.atualizarAtivo(req, res, next));
router.delete('/questionario/:id', (req, res, next) => questionarioController.deletar(req, res, next));

export default router;

import express from 'express';
import QuestionarioController from '../controller/QuestionarioController.js';
import { requireAbility } from '../middlewares/requireAbility.js';

const router = express.Router();
const questionarioController = new QuestionarioController();

// CANDIDATO e RECRUTADOR podem listar questionários
router.get('/questionario', requireAbility('read', 'Questionario'), (req, res, next) =>
  questionarioController.listar(req, res, next),
);

// CANDIDATO e RECRUTADOR podem visualizar um questionário
router.get('/questionario/:id', requireAbility('read', 'Questionario'), (req, res, next) =>
  questionarioController.buscarPorId(req, res, next),
);

// Apenas RECRUTADOR e ADMINISTRADOR podem criar questionários
router.post('/questionario', requireAbility('create', 'Questionario'), (req, res, next) =>
  questionarioController.criar(req, res, next),
);

// Apenas RECRUTADOR e ADMINISTRADOR podem atualizar questionários
router.put('/questionario/:id', requireAbility('update', 'Questionario'), (req, res, next) =>
  questionarioController.atualizar(req, res, next),
);

// Apenas RECRUTADOR e ADMINISTRADOR podem ativar/desativar questionários
router.patch('/questionario/:id/ativo', requireAbility('update', 'Questionario'), (req, res, next) =>
  questionarioController.atualizarAtivo(req, res, next),
);

// Apenas RECRUTADOR e ADMINISTRADOR podem deletar questionários
router.delete('/questionario/:id', requireAbility('delete', 'Questionario'), (req, res, next) =>
  questionarioController.deletar(req, res, next),
);

export default router;

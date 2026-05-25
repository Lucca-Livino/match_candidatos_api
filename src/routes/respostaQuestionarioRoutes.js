import express from 'express';
import RespostaQuestionarioController from '../controller/RespostaQuestionarioController.js';
import { requireAbility } from '../middlewares/requireAbility.js';

const router = express.Router();
const respostaQuestionarioController = new RespostaQuestionarioController();

// Todas as rotas de resposta de questionário exigem manage → apenas CANDIDATO e ADMINISTRADOR
router.post('/resposta-questionario/iniciar', requireAbility('create', 'RespostaQuestionario'), (req, res, next) =>
  respostaQuestionarioController.iniciar(req, res, next),
);

router.post('/resposta-questionario/:id/responder', requireAbility('update', 'RespostaQuestionario'), (req, res, next) =>
  respostaQuestionarioController.responder(req, res, next),
);

router.patch('/resposta-questionario/:id/finalizar', requireAbility('update', 'RespostaQuestionario'), (req, res, next) =>
  respostaQuestionarioController.finalizar(req, res, next),
);

router.get('/resposta-questionario/:id', requireAbility('read', 'RespostaQuestionario'), (req, res, next) =>
  respostaQuestionarioController.buscarPorId(req, res, next),
);

export default router;

import express from 'express';
import RespostaQuestionarioController from '../controller/RespostaQuestionarioController.js';

const router = express.Router();
const respostaQuestionarioController = new RespostaQuestionarioController();

router.post('/resposta-questionario/iniciar', (req, res, next) =>
  respostaQuestionarioController.iniciar(req, res, next),
);

router.post('/resposta-questionario/:id/responder', (req, res, next) =>
  respostaQuestionarioController.responder(req, res, next),
);

router.patch('/resposta-questionario/:id/finalizar', (req, res, next) =>
  respostaQuestionarioController.finalizar(req, res, next),
);

router.get('/resposta-questionario/:id', (req, res, next) =>
  respostaQuestionarioController.buscarPorId(req, res, next),
);

export default router;

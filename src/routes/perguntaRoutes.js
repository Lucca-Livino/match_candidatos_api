import express from 'express';
import PerguntaController from '../controller/PerguntaController.js';

const router = express.Router();
const perguntaController = new PerguntaController();

router.post('/pergunta', (req, res, next) =>
  perguntaController.criar(req, res, next),
);

router.get('/pergunta', (req, res, next) =>
  perguntaController.listar(req, res, next),
);

router.patch('/pergunta/reordenar', (req, res, next) =>
  perguntaController.reordenar(req, res, next),
);

router.get('/pergunta/:id', (req, res, next) =>
  perguntaController.buscarPorId(req, res, next),
);

router.put('/pergunta/:id', (req, res, next) =>
  perguntaController.atualizar(req, res, next),
);

router.delete('/pergunta/:id', (req, res, next) =>
  perguntaController.deletar(req, res, next),
);

router.post('/pergunta/:id/opcao', (req, res, next) =>
  perguntaController.adicionarOpcao(req, res, next),
);

router.put('/pergunta/:id/opcao/:opcaoId', (req, res, next) =>
  perguntaController.atualizarOpcao(req, res, next),
);

router.delete('/pergunta/:id/opcao/:opcaoId', (req, res, next) =>
  perguntaController.removerOpcao(req, res, next),
);

export default router;

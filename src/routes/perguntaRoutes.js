import express from 'express';
import PerguntaController from '../controller/PerguntaController.js';
import { requireAbility } from '../middlewares/requireAbility.js';

const router = express.Router();
const perguntaController = new PerguntaController();

// Todas as rotas de perguntas exigem manage → apenas RECRUTADOR e ADMINISTRADOR
router.post('/pergunta', requireAbility('create', 'Pergunta'), (req, res, next) =>
  perguntaController.criar(req, res, next),
);

router.get('/pergunta', requireAbility('read', 'Pergunta'), (req, res, next) =>
  perguntaController.listar(req, res, next),
);

router.patch('/pergunta/reordenar', requireAbility('update', 'Pergunta'), (req, res, next) =>
  perguntaController.reordenar(req, res, next),
);

router.get('/pergunta/:id', requireAbility('read', 'Pergunta'), (req, res, next) =>
  perguntaController.buscarPorId(req, res, next),
);

router.put('/pergunta/:id', requireAbility('update', 'Pergunta'), (req, res, next) =>
  perguntaController.atualizar(req, res, next),
);

router.delete('/pergunta/:id', requireAbility('delete', 'Pergunta'), (req, res, next) =>
  perguntaController.deletar(req, res, next),
);

router.post('/pergunta/:id/opcao', requireAbility('create', 'Pergunta'), (req, res, next) =>
  perguntaController.adicionarOpcao(req, res, next),
);

router.put('/pergunta/:id/opcao/:opcaoId', requireAbility('update', 'Pergunta'), (req, res, next) =>
  perguntaController.atualizarOpcao(req, res, next),
);

router.delete('/pergunta/:id/opcao/:opcaoId', requireAbility('delete', 'Pergunta'), (req, res, next) =>
  perguntaController.removerOpcao(req, res, next),
);

export default router;

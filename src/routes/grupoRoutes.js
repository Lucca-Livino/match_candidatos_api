import express from 'express';
import GrupoController from '../controller/GrupoController.js';

const router = express.Router();
const controller = new GrupoController();

router.get('/grupos', (req, res, next) => controller.listar(req, res).catch(next));
router.get('/grupos/:id', (req, res, next) => controller.buscarPorId(req, res).catch(next));
router.post('/grupos', (req, res, next) => controller.criar(req, res).catch(next));
router.patch('/grupos/:id', (req, res, next) => controller.atualizar(req, res).catch(next));
router.delete('/grupos/:id', (req, res, next) => controller.deletar(req, res).catch(next));

export default router;

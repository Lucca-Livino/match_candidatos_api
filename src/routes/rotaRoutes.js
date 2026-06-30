import express from 'express';
import RotaController from '../controller/RotaController.js';

const router = express.Router();
const controller = new RotaController();

router.get('/rotas', (req, res, next) => controller.listar(req, res).catch(next));
router.get('/rotas/:id', (req, res, next) => controller.buscarPorId(req, res).catch(next));
router.post('/rotas', (req, res, next) => controller.criar(req, res).catch(next));
router.patch('/rotas/:id', (req, res, next) => controller.atualizar(req, res).catch(next));
router.delete('/rotas/:id', (req, res, next) => controller.deletar(req, res).catch(next));

export default router;

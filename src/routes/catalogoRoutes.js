import express from 'express';
import CatalogoController from '../controller/CatalogoController.js';

const router = express.Router();
const controller = new CatalogoController();

router.get('/catalogo', (req, res, next) => controller.buscar(req, res, next));
router.post('/catalogo', (req, res, next) => controller.criar(req, res, next));
router.patch('/catalogo/:id', (req, res, next) => controller.atualizar(req, res, next));

export default router;

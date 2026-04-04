import express from 'express';
import UsuarioController from '../controller/UsuarioController.js';

const router = express.Router();
const usuarioController = new UsuarioController();

router.get('/usuarios', (req, res, next) => {
	usuarioController.listar(req, res).catch(next);
});

router.get('/usuarios/:id', (req, res, next) => {
	usuarioController.listarPorId(req, res).catch(next);
});

router.post('/usuarios', (req, res, next) => {
	usuarioController.criar(req, res).catch(next);
});

router.patch('/usuarios/:id', (req, res, next) => {
	usuarioController.atualizar(req, res).catch(next);
});

router.delete('/usuarios/:id', (req, res, next) => {
	usuarioController.deletar(req, res).catch(next);
});

export default router;

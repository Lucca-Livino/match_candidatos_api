import express from 'express';
import UsuarioController from '../controller/UsuarioController.js';

const router = express.Router();
const usuarioController = new UsuarioController();

// Rota pública de auto-cadastro de candidato (whitelisted no app.js)
router.post('/usuarios/registro', (req, res, next) => {
  usuarioController.registrar(req, res).catch(next);
});

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

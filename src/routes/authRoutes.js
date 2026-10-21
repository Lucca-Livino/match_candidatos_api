import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/me', authMiddleware, (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      tipos_permissao: user.tipos_permissao,
    },
  });
});

export default router;

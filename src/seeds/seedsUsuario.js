import "dotenv/config";
import mongoose from "mongoose";
import DbConnect from "../config/dbconnect.js";
import Usuario from "../models/Usuario.js";

const usuariosSeed = [
  {
    nome: "Ana Recrutadora",
    email: "ana.recrutadora@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["recrutador"],
    status_ativo: true,
  },
  {
    nome: "Bruno Admin",
    email: "bruno.admin@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["administrador"],
    status_ativo: true,
  },
  {
    nome: "Carla Multipla",
    email: "carla.multipla@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["recrutador"],
    status_ativo: true,
  },
  {
    nome: "Diego Candidato",
    email: "diego.candidato@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["candidato"],
    status_ativo: true,
  },
  {
    nome: "Elisa Candidata",
    email: "elisa.candidata@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["candidato"],
    status_ativo: true,
  },
  {
    nome: "Fabio Candidato",
    email: "fabio.candidato@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["candidato"],
    status_ativo: true,
  },
  // Candidato inativo: cobre o caminho de bloqueio de login/listagem.
  {
    nome: "Gabriela Inativa",
    email: "gabriela.inativa@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["candidato"],
    status_ativo: false,
  },
];

async function seedUsuario({ useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) {
      await DbConnect.conectar();
    }
    const { auth } = await import("../utils/auth.js");

    for (const usuario of usuariosSeed) {
      try {
        const db = mongoose.connection.db;

        // Limpar registros do Better Auth: busca o userId pelo email na collection 'usuarios'
        const authUser = await db.collection('usuarios').findOne({ email: usuario.email });
        if (authUser) {
          await db.collection('account').deleteMany({ userId: String(authUser._id) });
          await db.collection('session').deleteMany({ userId: String(authUser._id) });
          await db.collection('usuarios').deleteOne({ _id: authUser._id });
        }

        // Criar usuario no Better Auth
        await auth.api.signUpEmail({
          body: {
            email: usuario.email,
            password: usuario.senha,
            name: usuario.nome,
          },
        });

        const Grupo = (await import('../models/Grupo.js')).default;
        const grupo = await Grupo.findOne({ nome: usuario.tipos_permissao[0] }).lean();

        await Usuario.findOneAndUpdate(
          { email: usuario.email },
          { $set: {
              tipos_permissao: usuario.tipos_permissao,
              status_ativo: usuario.status_ativo,
              groups: grupo ? [grupo._id] : [],
          } },
        );
      } catch (err) {
        console.error(`Error creating user ${usuario.email}:`, err);
      }
    }

    console.log(
      `Carga de usuários finalizada com sucesso. ${usuariosSeed.length} usuários processados.`,
    );
  } catch (error) {
    console.error("Erro ao executar carga de usuários:", error);
    throw error;
  } finally {
    if (useOwnConnection) {
      await DbConnect.desconectar();
    }
  }
}

export default seedUsuario;

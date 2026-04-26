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
    tipos_permissao: ["Admin"],
    status_ativo: true,
  },
  {
    nome: "Carla Multipla",
    email: "carla.multipla@match.com",
    senha: 'Senha@123',
    tipos_permissao: ["recrutador", "Admin"],
    status_ativo: true,
  },
];

async function seedUsuario() {
  try {
    await DbConnect.conectar();
    const { auth } = await import("../utils/auth.js");

    for (const usuario of usuariosSeed) {
      try {
        await Usuario.deleteOne({ email: usuario.email });
        const db = mongoose.connection.db;
        await db.collection("account").deleteMany({ accountId: usuario.email });

        const user = await auth.api.signUpEmail({
          body: {
            email: usuario.email,
            password: usuario.senha,
            name: usuario.nome,
          }
        });


        await Usuario.findOneAndUpdate(
          { email: usuario.email },
          { $set: { tipos_permissao: usuario.tipos_permissao, status_ativo: usuario.status_ativo } }
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
    await DbConnect.desconectar();
  }
}

export default seedUsuario;

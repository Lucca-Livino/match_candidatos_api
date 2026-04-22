import "dotenv/config";
import DbConnect from "../config/dbconnect.js";
import Usuario from "../models/Usuario.js";

const usuariosSeed = [
  {
    nome: "Ana Recrutadora",
    email: "ana.recrutadora@match.com",
    tipos_permissao: ["recrutador"],
    status_ativo: true,
  },
  {
    nome: "Bruno Admin",
    email: "bruno.admin@match.com",
    tipos_permissao: ["Admin"],
    status_ativo: true,
  },
  {
    nome: "Carla Multipla",
    email: "carla.multipla@match.com",
    tipos_permissao: ["recrutador", "Admin"],
    status_ativo: true,
  },
];

async function seedUsuario() {
  try {
    await DbConnect.conectar();

    for (const usuario of usuariosSeed) {
      await Usuario.findOneAndUpdate(
        { email: usuario.email },
        { $set: usuario },
        { upsert: true, returnDocument: "after" },
      );
    }

    console.log(
      `✓ Carga de usuários finalizada com sucesso. ${usuariosSeed.length} usuários processados.`,
    );
  } catch (error) {
    console.error("✗ Erro ao executar carga de usuários:", error);
    throw error;
  } finally {
    await DbConnect.desconectar();
  }
}

export default seedUsuario;

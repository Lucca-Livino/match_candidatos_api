import "dotenv/config";
import DbConnect from "../config/dbconnect.js";
import Vaga from "../models/Vaga.js";

const vagasSeed = [
  {
    titulo: "Desenvolvedor Full Stack Node.js/React",
    descricao:
      "Procuramos desenvolvedor experiente em Node.js e React para atuar em projetos desafiadores",
    area: "TI",
    localizacao: "São Paulo, SP",
    tipo_contrato: "CLT",
    salario_minimo: 5000,
    salario_maximo: 8000,
    experiencia_minima: 3,
    status_vaga: "ativa",
    criterios: [
      {
        nome: "Node.js",
        tipo_criterio: "skill_tecnica",
      },
      {
        nome: "React",
        tipo_criterio: "skill_tecnica",
      },
      {
        nome: "Banco de Dados",
        tipo_criterio: "skill_tecnica",
      },
    ],
  },
  {
    titulo: "Analista de RH",
    descricao:
      "Buscamos profissional de RH com experiência em recrutamento e seleção",
    area: "RH",
    localizacao: "Rio de Janeiro, RJ",
    tipo_contrato: "CLT",
    salario_minimo: 3500,
    salario_maximo: 5500,
    experiencia_minima: 2,
    status_vaga: "ativa",
    criterios: [
      {
        nome: "Recrutamento",
        tipo_criterio: "experiencia",
      },
      {
        nome: "Análise de Comportamento",
        tipo_criterio: "skill_tecnica",
      },
    ],
  },
  {
    titulo: "Analista de Marketing Digital",
    descricao: "Oportunidade para profissional de marketing com foco em digital",
    area: "MARKETING",
    localizacao: "São Paulo, SP",
    tipo_contrato: "PJ",
    salario_minimo: 4000,
    salario_maximo: 7000,
    experiencia_minima: 2,
    status_vaga: "ativa",
    criterios: [
      {
        nome: "Google Analytics",
        tipo_criterio: "skill_tecnica",
      },
      {
        nome: "Redes Sociais",
        tipo_criterio: "experiencia",
      },
    ],
  },
];

async function seedVaga() {
  try {
    await DbConnect.conectar();

    for (const vaga of vagasSeed) {
      await Vaga.findOneAndUpdate(
        { titulo: vaga.titulo },
        { $set: vaga },
        { upsert: true, returnDocument: "after" },
      );
    }

    console.log(
      `✓ Carga de vagas finalizada com sucesso. ${vagasSeed.length} vagas processadas.`,
    );
  } catch (error) {
    console.error("✗ Erro ao executar carga de vagas:", error);
    throw error;
  } finally {
    await DbConnect.desconectar();
  }
}

export default seedVaga;

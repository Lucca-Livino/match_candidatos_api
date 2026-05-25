import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Vaga from '../models/Vaga.js';

const vagasSeed = [
  {
    titulo: 'Desenvolvedor Full Stack Node.js/React',
    descricao: 'Procuramos desenvolvedor experiente em Node.js e React para atuar em projetos desafiadores.',
    area: 'TI',
    requisitos_gerais: 'Conhecimento em APIs REST, bancos NoSQL e testes automatizados.',
    status: 'ativa',
    criterio_vaga: [
      {
        nome: 'Node.js',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 40,
        obrigatorio: true,
        descricao: 'Experiencia com Node.js em producao.',
      },
      {
        nome: 'React',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 30,
        obrigatorio: true,
        descricao: 'Experiencia com interfaces React.',
      },
      {
        nome: 'Banco de dados',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 30,
        obrigatorio: false,
        descricao: 'Modelagem e consultas em bancos de dados.',
      },
    ],
  },
  {
    titulo: 'Analista de RH',
    descricao: 'Buscamos profissional de RH com experiencia em recrutamento e selecao.',
    area: 'RH',
    requisitos_gerais: 'Vivencia com entrevistas e triagem de curriculos.',
    status: 'ativa',
    criterio_vaga: [
      {
        nome: 'Recrutamento',
        tipo_criterio: 'experiencia',
        peso_percentual: 60,
        obrigatorio: true,
        descricao: 'Experiencia pratica em recrutamento e selecao.',
      },
      {
        nome: 'Analise de comportamento',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 40,
        obrigatorio: false,
        descricao: 'Conhecimentos em avaliacao comportamental.',
      },
    ],
  },
  {
    titulo: 'Analista de Marketing Digital',
    descricao: 'Oportunidade para profissional de marketing com foco em digital.',
    area: 'MARKETING',
    requisitos_gerais: 'Experiencia com campanhas digitais e analise de dados.',
    status: 'ativa',
    criterio_vaga: [
      {
        nome: 'Google Analytics',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 50,
        obrigatorio: true,
        descricao: 'Uso de Google Analytics para mensurar campanhas.',
      },
      {
        nome: 'Redes sociais',
        tipo_criterio: 'experiencia',
        peso_percentual: 50,
        obrigatorio: false,
        descricao: 'Experiencia com estrategias de redes sociais.',
      },
    ],
  },
];

async function seedVaga({ useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) {
      await DbConnect.conectar();
    }

    const vagasCriadas = [];

    for (const vaga of vagasSeed) {
      const created = await Vaga.findOneAndUpdate(
        { titulo: vaga.titulo },
        { $set: vaga },
        { upsert: true, returnDocument: 'after', runValidators: true },
      ).lean();

      if (created) {
        vagasCriadas.push(created);
      }
    }

    console.log(`✓ Carga de vagas finalizada com sucesso. ${vagasCriadas.length} vagas processadas.`);
    return vagasCriadas;
  } catch (error) {
    console.error('✗ Erro ao executar carga de vagas:', error);
    throw error;
  } finally {
    if (useOwnConnection) {
      await DbConnect.desconectar();
    }
  }
}

export default seedVaga;

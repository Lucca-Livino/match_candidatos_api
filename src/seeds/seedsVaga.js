import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Vaga from '../models/Vaga.js';
import ItemCatalogo from '../models/ItemCatalogo.js';
import { normalizarChave } from '../utils/helpers/normalizarChave.js';

// Pela chave normalizada: o nome no catalogo pode ter acento que este arquivo nao tem.
const idDe = async (tipo, nome) => (await ItemCatalogo.findOne({ tipo, chaves: normalizarChave(nome) }).lean())?.id;

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
        descricao: 'Experiência com Node.js em produção.',
      },
      {
        nome: 'React',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 30,
        obrigatorio: true,
        descricao: 'Experiência com interfaces React.',
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
    descricao: 'Buscamos profissional de RH com experiência em recrutamento e seleção.',
    area: 'RH',
    requisitos_gerais: 'Vivência com entrevistas e triagem de currículos.',
    status: 'ativa',
    criterio_vaga: [
      {
        nome: 'Recrutamento',
        tipo_criterio: 'experiencia',
        peso_percentual: 60,
        obrigatorio: true,
        descricao: 'Experiência prática em recrutamento e seleção.',
      },
      {
        nome: 'Análise de comportamento',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 40,
        obrigatorio: false,
        descricao: 'Conhecimentos em avaliação comportamental.',
      },
    ],
  },
  {
    titulo: 'Analista de Marketing Digital',
    descricao: 'Oportunidade para profissional de marketing com foco em digital.',
    area: 'MARKETING',
    requisitos_gerais: 'Experiência com campanhas digitais e análise de dados.',
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
        descricao: 'Experiência com estratégias de redes sociais.',
      },
    ],
  },
];

async function seedVaga({ useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) {
      await DbConnect.conectar();
    }

    const requisitos = {
      'Node.js': { itemId: await idDe('habilidade', 'Node.js') },
      React: { itemId: await idDe('habilidade', 'React') },
      Recrutamento: { areaId: await idDe('area_atuacao', 'Recrutamento e seleção'), mesesMinimos: 6 },
      'Google Analytics': { itemId: await idDe('habilidade', 'Google Analytics') },
    };
    const comRequisito = (vaga) => ({
      ...vaga,
      criterio_vaga: vaga.criterio_vaga.map((c) => {
        if (!c.obrigatorio) return c;
        const requisito = requisitos[c.nome];
        if (!requisito || Object.values(requisito).some((v) => v === undefined)) {
          throw new Error(`Seed inconsistente: criterio obrigatorio "${c.nome}" sem requisito resolvido no catalogo.`);
        }
        return { ...c, requisito };
      }),
    });

    const vagasCriadas = [];

    for (const vaga of vagasSeed) {
      const created = await Vaga.findOneAndUpdate(
        { titulo: vaga.titulo },
        { $set: comRequisito(vaga) },
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

import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import ItemCatalogo, { calcularChaves } from '../models/ItemCatalogo.js';
import { normalizarChave } from '../utils/helpers/normalizarChave.js';

// [nome, sinonimos, implica (por nome)]
const HABILIDADES = [
  ['JavaScript', ['JS', 'ECMAScript'], []],
  ['TypeScript', ['TS'], ['JavaScript']],
  ['Node.js', ['NodeJS', 'Node'], ['JavaScript']],
  ['React', ['ReactJS', 'React.js'], ['JavaScript']],
  ['Vue.js', ['Vue', 'VueJS'], ['JavaScript']],
  ['Angular', [], ['TypeScript']],
  ['HTML', ['HTML5'], []],
  ['CSS', ['CSS3'], []],
  ['Tailwind CSS', ['Tailwind'], ['CSS']],
  ['Python', [], []],
  ['Django', [], ['Python']],
  ['Java', [], []],
  ['Spring Boot', ['Spring'], ['Java']],
  ['C#', ['CSharp'], []],
  ['.NET', ['dotnet', 'ASP.NET'], ['C#']],
  ['PHP', [], []],
  ['Laravel', [], ['PHP']],
  ['SQL', ['Banco de dados relacional'], []],
  ['PostgreSQL', ['Postgres'], ['SQL']],
  ['MySQL', [], ['SQL']],
  ['SQL Server', ['MSSQL'], ['SQL']],
  ['MongoDB', ['Mongo'], []],
  ['Git', [], []],
  ['Docker', [], []],
  ['APIs REST', ['REST', 'RESTful'], []],
  ['Testes automatizados', ['Testes unitários'], []],
  ['Jest', [], ['Testes automatizados']],
  ['Linux', [], []],
  ['AWS', ['Amazon Web Services'], []],
  ['Excel', ['Microsoft Excel', 'Planilhas'], []],
  ['Power BI', ['PowerBI'], []],
  ['Google Analytics', ['GA4'], []],
  ['SEO', [], []],
  ['Figma', [], []],
  ['Inglês', ['Inglês avançado', 'English'], []],
  ['Espanhol', [], []],
  ['Recrutamento e seleção', ['R&S', 'Recrutamento'], []],
  ['Avaliação comportamental', ['Análise de comportamento', 'DISC'], []],
  ['Atendimento ao cliente', ['Atendimento'], []],
  ['Vendas', [], []],
];

const AREAS_CURSO = [
  ['Computação', ['Ciência da Computação', 'Sistemas de Informação', 'Análise e Desenvolvimento de Sistemas', 'ADS', 'Engenharia de Software', 'Engenharia de Computação', 'Informática'], []],
  ['Administração', ['Gestão', 'Gestão Empresarial'], []],
  ['Psicologia', [], []],
  ['Gestão de Recursos Humanos', ['Recursos Humanos', 'RH'], []],
  ['Marketing', ['Publicidade e Propaganda', 'Comunicação Social'], []],
  ['Direito', [], []],
  ['Contabilidade', ['Ciências Contábeis'], []],
  ['Economia', ['Ciências Econômicas'], []],
  ['Engenharia', ['Engenharia Civil', 'Engenharia Elétrica', 'Engenharia Mecânica', 'Engenharia de Produção'], []],
  ['Design', ['Design Gráfico', 'Design Digital'], []],
  ['Pedagogia', ['Licenciatura'], []],
  ['Letras', [], []],
];

const AREAS_ATUACAO = [
  ['Desenvolvimento de software', ['Desenvolvedor', 'Programador', 'Analista de Sistemas', 'Engenheiro de Software', 'Desenvolvedor Back-end', 'Desenvolvedor Front-end', 'Desenvolvedor Full Stack', 'Estagiário de Desenvolvimento'], []],
  ['Suporte técnico', ['Técnico de Suporte', 'Analista de Suporte', 'Help Desk'], []],
  ['Dados', ['Analista de Dados', 'Cientista de Dados', 'Engenheiro de Dados'], []],
  ['Recrutamento e seleção', ['Recrutador', 'Analista de Recrutamento', 'Analista de RH', 'Tech Recruiter'], []],
  ['Atendimento ao cliente', ['Atendente', 'Operador de Telemarketing', 'SAC'], []],
  ['Vendas', ['Vendedor', 'Consultor de Vendas', 'Representante Comercial'], []],
  ['Marketing digital', ['Analista de Marketing', 'Social Media', 'Analista de Mídias Sociais'], []],
  ['Administrativo', ['Assistente Administrativo', 'Auxiliar Administrativo'], []],
  ['Financeiro', ['Analista Financeiro', 'Assistente Financeiro'], []],
  ['Design', ['Designer', 'UX Designer', 'UI Designer'], []],
  ['Gestão de projetos', ['Gerente de Projetos', 'Scrum Master', 'Product Owner'], []],
  ['Docência', ['Professor', 'Instrutor', 'Monitor'], []],
];

const CERTIFICACOES = [
  ['AWS Certified Cloud Practitioner', ['AWS CCP'], []],
  ['AWS Certified Solutions Architect Associate', ['AWS SAA'], []],
  ['Microsoft Azure Fundamentals', ['AZ-900'], []],
  ['Google Analytics Individual Qualification', ['GAIQ', 'Certificação Google Analytics'], []],
  ['Scrum Master Certificado', ['CSM', 'PSM I', 'PSM'], []],
  ['ITIL Foundation', ['ITIL'], []],
  ['CompTIA A+', [], []],
  ['TOEFL', [], []],
  ['Cambridge English', ['FCE', 'CAE'], []],
  ['PMP', ['Project Management Professional'], []],
];

const GRUPOS = { habilidade: HABILIDADES, area_curso: AREAS_CURSO, area_atuacao: AREAS_ATUACAO, certificacao: CERTIFICACOES };

async function seedCatalogo({ useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) await DbConnect.conectar();
    await ItemCatalogo.init();

    // 1a passada: itens sem implica, para existir id de todos.
    for (const [tipo, itens] of Object.entries(GRUPOS)) {
      for (const [nome, sinonimos] of itens) {
        // Casa pela chave, nao pelo nome: corrigir a grafia (ex.: acento)
        // renomeia o item existente e mantem o id que vagas e perfis usam.
        await ItemCatalogo.findOneAndUpdate(
          { tipo, chaves: normalizarChave(nome) },
          { $set: { tipo, nome, sinonimos, ativo: true, chaves: calcularChaves(nome, sinonimos) } },
          { upsert: true, returnDocument: 'after' },
        );
      }
    }

    // 2a passada: implica por nome -> id, sempre do mesmo tipo.
    for (const [tipo, itens] of Object.entries(GRUPOS)) {
      const docs = await ItemCatalogo.find({ tipo }).lean();
      const idPorNome = new Map(docs.map((d) => [d.nome, d.id]));
      for (const [nome, , implica] of itens) {
        await ItemCatalogo.updateOne({ tipo, nome }, { $set: { implica: implica.map((n) => idPorNome.get(n)).filter(Boolean) } });
      }
    }

    const total = Object.values(GRUPOS).reduce((s, l) => s + l.length, 0);
    console.log(`Carga do catalogo finalizada. ${total} itens.`);
  } finally {
    if (useOwnConnection) await DbConnect.desconectar();
  }
}

export default seedCatalogo;

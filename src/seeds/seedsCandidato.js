import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Candidato from '../models/Candidato.js';
import Formacao from '../models/Formacao.js';
import Experiencia from '../models/Experiencia.js';
import Habilidade from '../models/Habilidade.js';
import Certificacao from '../models/Certificacao.js';
import CandidatoVaga from '../models/CandidatoVaga.js';
import { hashPassword } from '../utils/password.js';

const CANDIDATO_SEED_PASSWORD = 'Senha@123';

const candidatosSeed = [
  {
    candidato: {
      nome: 'Marina Silva',
      email: 'marina.silva@candidato.com',
      senha: CANDIDATO_SEED_PASSWORD,
      telefone: '(11) 98888-1111',
      linkedin: 'https://www.linkedin.com/in/marina-silva',
      cidade: 'Sao Paulo',
      estado: 'SP',
    },
    formacoes: [
      {
        instituicao: 'Universidade Federal',
        curso: 'Ciencia da Computacao',
        grau: 'graduacao',
        situacao: 'concluido',
        anoInicio: 2017,
        anoConclusao: 2021,
      },
    ],
    experiencias: [
      {
        empresa: 'Tech Solucoes',
        cargo: 'Desenvolvedora Backend',
        descricaoAtivida_: 'Desenvolvimento de APIs Node.js e manutencao de servicos.',
        dataInicio: new Date('2022-01-10'),
        dataFim: null,
        mesesDuracao: 48,
      },
    ],
    habilidades: [
      { habilidade: 'Node.js', nivel: 'avancado' },
      { habilidade: 'MongoDB', nivel: 'intermediario' },
    ],
    certificacoes: [
      {
        nome: 'MongoDB Associate Developer',
        emissor: 'MongoDB University',
        dataEmissao: new Date('2023-03-15'),
        dataExpiracao: null,
        codigo: 'MDB-2023-001',
      },
    ],
    candidaturas: [
      {
        vagaId: 'vaga-backend-jr',
        compativel: 1,
        motivoIncompat_: '',
        status: 'inscrito',
        movidoPor: 'sistema',
      },
    ],
  },
  {
    candidato: {
      nome: 'Carlos Roberto Mendes',
      email: 'carlos.mendes@candidato.com',
      senha: CANDIDATO_SEED_PASSWORD,
      telefone: '(21) 99888-2222',
      linkedin: 'https://www.linkedin.com/in/carlos-mendes',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
    },
    formacoes: [
      {
        instituicao: 'Universidade Estadual',
        curso: 'Engenharia de Software',
        grau: 'graduacao',
        situacao: 'concluido',
        anoInicio: 2015,
        anoConclusao: 2019,
      },
      {
        instituicao: 'Instituto Tecnologico',
        curso: 'Especializacao em Arquitetura de Microservicos',
        grau: 'pos_graduacao',
        situacao: 'concluido',
        anoInicio: 2020,
        anoConclusao: 2021,
      },
    ],
    experiencias: [
      {
        empresa: 'Banco Digital',
        cargo: 'Engenheiro de Software Senior',
        descricaoAtivida_: 'Arquitetura e desenvolvimento de servicos backend em ambiente cloud.',
        dataInicio: new Date('2021-06-15'),
        dataFim: null,
        mesesDuracao: 34,
      },
      {
        empresa: 'Fintech Solutions',
        cargo: 'Desenvolvedor Backend',
        descricaoAtivida_: 'Implementacao de APIs REST e processamento de pagamentos.',
        dataInicio: new Date('2019-03-01'),
        dataFim: new Date('2021-05-30'),
        mesesDuracao: 27,
      },
    ],
    habilidades: [
      { habilidade: 'Java', nivel: 'avancado' },
      { habilidade: 'Spring Boot', nivel: 'avancado' },
      { habilidade: 'PostgreSQL', nivel: 'avancado' },
      { habilidade: 'Docker', nivel: 'intermediario' },
      { habilidade: 'Kubernetes', nivel: 'intermediario' },
    ],
    certificacoes: [
      {
        nome: 'AWS Certified Solutions Architect - Professional',
        emissor: 'Amazon Web Services',
        dataEmissao: new Date('2022-11-20'),
        dataExpiracao: new Date('2025-11-20'),
        codigo: 'AWS-SA-2022-001',
      },
      {
        nome: 'Certified Kubernetes Administrator',
        emissor: 'Cloud Native Computing Foundation',
        dataEmissao: new Date('2023-07-10'),
        dataExpiracao: new Date('2026-07-10'),
        codigo: 'CKA-2023-002',
      },
    ],
    candidaturas: [
      {
        vagaId: 'vaga-backend-senior',
        compativel: 1,
        motivoIncompat_: '',
        status: 'em_analise',
        movidoPor: 'sistema',
      },
    ],
  },
  {
    candidato: {
      nome: 'Fernanda Oliveira',
      email: 'fernanda.oliveira@candidato.com',
      senha: CANDIDATO_SEED_PASSWORD,
      telefone: '(85) 99777-3333',
      linkedin: 'https://www.linkedin.com/in/fernanda-oliveira',
      cidade: 'Fortaleza',
      estado: 'CE',
    },
    formacoes: [
      {
        instituicao: 'Faculdade Privada',
        curso: 'Analise e Desenvolvimento de Sistemas',
        grau: 'tecnico',
        situacao: 'concluido',
        anoInicio: 2019,
        anoConclusao: 2021,
      },
      {
        instituicao: 'Bootcamp Dev',
        curso: 'Desenvolvedor Full Stack Javascript',
        grau: 'tecnico',
        situacao: 'concluido',
        anoInicio: 2021,
        anoConclusao: 2022,
      },
    ],
    experiencias: [
      {
        empresa: 'Startup Inovacao',
        cargo: 'Desenvolvedora Full Stack',
        descricaoAtivida_: 'Desenvolvimento de aplicacoes web com React e Node.js para plataforma de e-commerce.',
        dataInicio: new Date('2022-06-01'),
        dataFim: null,
        mesesDuracao: 34,
      },
      {
        empresa: 'Agencia Web',
        cargo: 'Desenvolvedora Frontend',
        descricaoAtivida_: 'Criacao de interfaces responsivas e otimizacao de performance.',
        dataInicio: new Date('2021-10-15'),
        dataFim: new Date('2022-05-31'),
        mesesDuracao: 8,
      },
    ],
    habilidades: [
      { habilidade: 'React', nivel: 'avancado' },
      { habilidade: 'Node.js', nivel: 'intermediario' },
      { habilidade: 'JavaScript', nivel: 'avancado' },
      { habilidade: 'HTML/CSS', nivel: 'avancado' },
      { habilidade: 'Git', nivel: 'intermediario' },
    ],
    certificacoes: [
      {
        nome: 'React Developer Certified',
        emissor: 'Udemy',
        dataEmissao: new Date('2022-03-10'),
        dataExpiracao: null,
        codigo: 'REACT-2022-003',
      },
    ],
    candidaturas: [
      {
        vagaId: 'vaga-frontend-jr',
        compativel: 1,
        motivoIncompat_: '',
        status: 'inscrito',
        movidoPor: 'sistema',
      },
    ],
  },
  {
    candidato: {
      nome: 'Rafael Santos',
      email: 'rafael.santos@candidato.com',
      senha: CANDIDATO_SEED_PASSWORD,
      telefone: '(31) 98666-4444',
      linkedin: 'https://www.linkedin.com/in/rafael-santos',
      cidade: 'Belo Horizonte',
      estado: 'MG',
    },
    formacoes: [
      {
        instituicao: 'Universidade Federal',
        curso: 'Ciencia da Computacao',
        grau: 'graduacao',
        situacao: 'concluido',
        anoInicio: 2016,
        anoConclusao: 2020,
      },
      {
        instituicao: 'Universidade Federal',
        curso: 'Mestrado em Ciencia da Computacao',
        grau: 'mestrado',
        situacao: 'concluido',
        anoInicio: 2020,
        anoConclusao: 2023,
      },
    ],
    experiencias: [
      {
        empresa: 'Empresa Tecnologia Avancada',
        cargo: 'Pesquisador e Desenvolvedor',
        descricaoAtivida_: 'Pesquisa e desenvolvimento em machine learning e data science.',
        dataInicio: new Date('2023-03-01'),
        dataFim: null,
        mesesDuracao: 13,
      },
      {
        empresa: 'Consultoria De TI',
        cargo: 'Analista de Dados',
        descricaoAtivida_: 'Analise de dados e desenvolvimento de dashboards interativos.',
        dataInicio: new Date('2020-08-10'),
        dataFim: new Date('2023-02-28'),
        mesesDuracao: 31,
      },
    ],
    habilidades: [
      { habilidade: 'Python', nivel: 'avancado' },
      { habilidade: 'Machine Learning', nivel: 'avancado' },
      { habilidade: 'SQL', nivel: 'avancado' },
      { habilidade: 'Data Science', nivel: 'intermediario' },
      { habilidade: 'TensorFlow', nivel: 'intermediario' },
    ],
    certificacoes: [
      {
        nome: 'Google Cloud Professional Data Engineer',
        emissor: 'Google Cloud',
        dataEmissao: new Date('2023-05-15'),
        dataExpiracao: new Date('2025-05-15'),
        codigo: 'GCP-DATA-2023-001',
      },
      {
        nome: 'Certificacao em Machine Learning',
        emissor: 'Coursera',
        dataEmissao: new Date('2023-01-20'),
        dataExpiracao: null,
        codigo: 'ML-COURSERA-2023-002',
      },
    ],
    candidaturas: [
      {
        vagaId: 'vaga-data-scientist',
        compativel: 1,
        motivoIncompat_: '',
        status: 'inscrito',
        movidoPor: 'sistema',
      },
    ],
  },
  {
    candidato: {
      nome: 'Amanda Pereira',
      email: 'amanda.pereira@candidato.com',
      senha: CANDIDATO_SEED_PASSWORD,
      telefone: '(48) 99555-5555',
      linkedin: 'https://www.linkedin.com/in/amanda-pereira',
      cidade: 'Florianopolis',
      estado: 'SC',
    },
    formacoes: [
      {
        instituicao: 'Universidade Privada',
        curso: 'Sistemas de Informacao',
        grau: 'graduacao',
        situacao: 'concluido',
        anoInicio: 2018,
        anoConclusao: 2022,
      },
      {
        instituicao: 'Instituto de Pos-Graduacao',
        curso: 'MBA em Gestao de TI',
        grau: 'pos_graduacao',
        situacao: 'em_andamento',
        anoInicio: 2023,
        anoConclusao: null,
      },
    ],
    experiencias: [
      {
        empresa: 'Grande Corporacao',
        cargo: 'Coordinadora de Projetos TI',
        descricaoAtivida_: 'Coordenacao de projetos de transformacao digital e implementacao de sistemas.',
        dataInicio: new Date('2022-07-15'),
        dataFim: null,
        mesesDuracao: 21,
      },
      {
        empresa: 'Empresa de Consultoria',
        cargo: 'Analista de Sistemas',
        descricaoAtivida_: 'Analise de requisitos e implementacao de solucoes de TI.',
        dataInicio: new Date('2022-01-10'),
        dataFim: new Date('2022-06-30'),
        mesesDuracao: 6,
      },
    ],
    habilidades: [
      { habilidade: 'Project Management', nivel: 'avancado' },
      { habilidade: 'Jira', nivel: 'avancado' },
      { habilidade: 'Python', nivel: 'intermediario' },
      { habilidade: 'SQL', nivel: 'intermediario' },
      { habilidade: 'Agile/Scrum', nivel: 'avancado' },
    ],
    certificacoes: [
      {
        nome: 'Certified Scrum Master',
        emissor: 'Scrum Alliance',
        dataEmissao: new Date('2022-09-10'),
        dataExpiracao: new Date('2025-09-10'),
        codigo: 'CSM-2022-001',
      },
      {
        nome: 'Prince2 Foundation',
        emissor: 'AXELOS',
        dataEmissao: new Date('2023-02-28'),
        dataExpiracao: null,
        codigo: 'PRINCE2-2023-001',
      },
      {
        nome: 'Public Cloud Associate Architect',
        emissor: 'Microsoft Azure',
        dataEmissao: new Date('2023-08-15'),
        dataExpiracao: new Date('2025-08-15'),
        codigo: 'AZURE-ARCH-2023-001',
      },
    ],
    candidaturas: [
      {
        vagaId: 'vaga-pm-senior',
        compativel: 1,
        motivoIncompat_: '',
        status: 'inscrito',
        movidoPor: 'sistema',
      },
    ],
  },
];

async function seedCandidato() {
  try {
    await DbConnect.conectar();

    for (const item of candidatosSeed) {
      const candidatoComHash = {
        ...item.candidato,
        senha: await hashPassword(item.candidato.senha),
      };

      const candidatoExistente = await Candidato.findOneAndUpdate(
        { email: item.candidato.email },
        { $set: candidatoComHash },
        { upsert: true, returnDocument: 'after' },
      );

      const candidatoId = candidatoExistente.id;

      await Promise.all([
        Formacao.deleteMany({ candidatoId }),
        Experiencia.deleteMany({ candidatoId }),
        Habilidade.deleteMany({ candidatoId }),
        Certificacao.deleteMany({ candidatoId }),
        CandidatoVaga.deleteMany({ candidatoId }),
      ]);

      await Promise.all([
        Formacao.insertMany(item.formacoes.map((f) => ({ ...f, candidatoId }))),
        Experiencia.insertMany(item.experiencias.map((e) => ({ ...e, candidatoId }))),
        Habilidade.insertMany(item.habilidades.map((h) => ({ ...h, candidatoId }))),
        Certificacao.insertMany(item.certificacoes.map((c) => ({ ...c, candidatoId }))),
        CandidatoVaga.insertMany(item.candidaturas.map((c) => ({ ...c, candidatoId }))),
      ]);
    }

    console.log(`✓ Carga de candidato finalizada com sucesso. ${candidatosSeed.length} candidatos processados.`);
  } catch (error) {
    console.error('Erro ao executar carga de candidato:', error);
    throw error;
  } finally {
    await DbConnect.desconectar();
  }
}

export default seedCandidato;

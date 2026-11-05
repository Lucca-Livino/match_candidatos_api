import { normalizarTexto, palavrasSignificativas } from './normalizarTexto.js';

const IGNORADAS = new Set([
  'candidato', 'candidata', 'possui', 'declara', 'informa', 'menciona', 'cita', 'citou', 'acertou', 'errou',
  'pergunta', 'questao', 'resposta', 'respondeu', 'curriculo', 'evidencia', 'atende', 'criterio', 'sobre',
  'como', 'para', 'pelo', 'pela', 'mais', 'anos', 'meses', 'nivel', 'experiencia', 'formacao', 'habilidade',
  'certificacao', 'constroi', 'construiu', 'trabalha', 'trabalhou', 'atua', 'atuou', 'tem', 'demonstra',
]);

const NOTA_MINIMA = 0.5;
const COBERTURA_MINIMA = 0.7;
const LIMITE_EVIDENCIA = 300;

const coletarTextos = (valor) => {
  if (typeof valor === 'string' || typeof valor === 'number') return [String(valor)];
  if (Array.isArray(valor)) return valor.flatMap(coletarTextos);
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(coletarTextos);
  return [];
};

const semEvidencia = (evidencia) => normalizarTexto(evidencia).includes('sem evidencia');

export const conferirEvidencias = (curriculo, questionario, criteriosAvaliados = []) => {
  const material = new Set(coletarTextos([curriculo, questionario]).flatMap((t) => palavrasSignificativas(t)));

  return (criteriosAvaliados ?? [])
    .filter((c) => Number(c?.aderencia) >= NOTA_MINIMA && !semEvidencia(c?.evidencia))
    .filter((c) => {
      const palavras = palavrasSignificativas(c.evidencia, IGNORADAS);
      if (palavras.length === 0) return false;
      const presentes = palavras.filter((p) => material.has(p)).length;
      return presentes / palavras.length < COBERTURA_MINIMA;
    })
    .map((c) => ({ criterioId: String(c.criterioId), evidencia: String(c.evidencia ?? '').slice(0, LIMITE_EVIDENCIA) }));
};

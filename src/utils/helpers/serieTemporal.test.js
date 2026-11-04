import { inicioDoPeriodo, granularidadeDo, montarSerie } from './serieTemporal.js';

const AGORA = new Date('2026-09-30T12:00:00Z');

describe('serieTemporal', () => {
  it('inicioDoPeriodo recua dias, meses ou devolve null em tudo', () => {
    expect(inicioDoPeriodo('30d', AGORA).toISOString()).toBe('2026-08-31T12:00:00.000Z');
    expect(inicioDoPeriodo('90d', AGORA).toISOString()).toBe('2026-07-02T12:00:00.000Z');
    expect(inicioDoPeriodo('12m', AGORA).toISOString()).toBe('2025-09-30T12:00:00.000Z');
    expect(inicioDoPeriodo('tudo', AGORA)).toBeNull();
  });

  it('granularidade: semana ate 90 dias, mes acima', () => {
    expect(granularidadeDo('30d')).toBe('semana');
    expect(granularidadeDo('90d')).toBe('semana');
    expect(granularidadeDo('12m')).toBe('mes');
    expect(granularidadeDo('tudo')).toBe('mes');
  });

  it('semanas comecam na segunda e periodos vazios entram com zero', () => {
    const datas = ['2026-09-15T10:00:00Z', '2026-09-16T23:00:00Z', '2026-09-29T08:00:00Z'].map((d) => new Date(d));
    const serie = montarSerie(datas, 'semana', new Date('2026-09-14T09:00:00Z'), AGORA);

    expect(serie).toEqual({
      granularidade: 'semana',
      pontos: [
        { inicio: '2026-09-14', total: 2 },
        { inicio: '2026-09-21', total: 0 },
        { inicio: '2026-09-28', total: 1 },
      ],
    });
  });

  it('sem inicio (tudo) comeca na data mais antiga', () => {
    const datas = [new Date('2026-09-02T00:00:00Z'), new Date('2026-07-10T00:00:00Z')];
    const serie = montarSerie(datas, 'mes', null, AGORA);

    expect(serie.pontos).toEqual([
      { inicio: '2026-07-01', total: 1 },
      { inicio: '2026-08-01', total: 0 },
      { inicio: '2026-09-01', total: 1 },
    ]);
  });

  it('tudo sem nenhuma data devolve pontos vazios', () => {
    expect(montarSerie([], 'mes', null, AGORA)).toEqual({ granularidade: 'mes', pontos: [] });
  });
});

import * as XLSX from "xlsx";

export type Linha = { produto: string; vazao: number };
export type LinhaCalc = Linha & {
  carteira: number;
  horas: number;
  dias: number;
  rep: number;
  // Parcela do produto na média ponderada geral (somando todos os produtos dá a média geral).
  vazaoPond: number;
  prodDiaPond: number;
};

export const PRODUTOS: Linha[] = [
  { produto: "F28", vazao: 3000 },
  { produto: "F35", vazao: 2800 },
  { produto: "NUTRIGEL", vazao: 4000 },
  { produto: "D48 - CYSY/FURQ.", vazao: 2100 },
  { produto: "D48 OUTROS", vazao: 2700 },
  { produto: "D25", vazao: 3000 },
];

export function calcular(linhas: (Linha & { carteira: number })[]) {
  const totalCarteira = linhas.reduce((s, l) => s + l.carteira, 0);
  const horasDe = (l: Linha & { carteira: number }) => (l.vazao > 0 ? l.carteira / l.vazao : 0);
  const totalHoras = linhas.reduce((s, l) => s + horasDe(l), 0);
  const calc: LinhaCalc[] = linhas.map((l) => {
    const horas = horasDe(l);
    // vazão_i ponderada pelo tempo: vazão_i × (horas_i / totalHoras) = carteira_i / totalHoras
    const vazaoPond = totalHoras && l.vazao > 0 ? l.carteira / totalHoras : 0;
    return {
      ...l,
      horas,
      dias: horas / 24,
      rep: totalCarteira ? l.carteira / totalCarteira : 0,
      vazaoPond,
      prodDiaPond: vazaoPond * 24,
    };
  });
  const totalDias = totalHoras / 24;
  const mediaVazao = totalHoras ? totalCarteira / totalHoras : 0;
  return { calc, totalCarteira, totalHoras, totalDias, mediaVazao, producaoDia: mediaVazao * 24 };
}

export type ConfigHoras = {
  mes: string; // "AAAA-MM"
  horasDia: number;
  feriados: number; // feriados de segunda a sábado (saem dos dias normais)
  extras: number; // domingos e feriados que serão trabalhados (hora extra)
};

// Dias normais de trabalho: segunda a sábado (domingo é folga).
export function diasNormaisDoMes(mes: string): number {
  const [ano, m] = mes.split("-").map(Number);
  if (!ano || !m) return 0;
  const total = new Date(ano, m, 0).getDate();
  let dias = 0;
  for (let d = 1; d <= total; d++) if (new Date(ano, m - 1, d).getDay() !== 0) dias++;
  return dias;
}

export function calcularHoras(c: ConfigHoras, horasNecessarias: number) {
  const diasNormais = Math.max(0, diasNormaisDoMes(c.mes) - c.feriados);
  const horasNormais = diasNormais * c.horasDia;
  const horasExtras = c.extras * c.horasDia;
  const horasTotais = horasNormais + horasExtras;
  const saldo = horasTotais - horasNecessarias;
  return {
    diasNormais,
    horasNormais,
    horasExtras,
    horasTotais,
    saldo,
    ocupacao: horasTotais ? horasNecessarias / horasTotais : 0,
    atende: saldo >= 0,
  };
}

export function exportar(
  r: ReturnType<typeof calcular>,
  h: ReturnType<typeof calcularHoras>,
  c: ConfigHoras,
) {
  const aoa: (string | number)[][] = [
    [
      "Produto",
      "Vazão/h",
      "Carteira",
      "Hrs necessárias",
      "Dias necessários",
      "Representatividade",
      "Média pond. vazão/h necessária",
      "Média pond. produção/dia necessária (kg)",
    ],
  ];
  r.calc.forEach((l) =>
    aoa.push([
      l.produto,
      l.vazao,
      l.carteira,
      +l.horas.toFixed(1),
      +l.dias.toFixed(1),
      +l.rep.toFixed(4),
      Math.round(l.vazaoPond),
      Math.round(l.prodDiaPond),
    ]),
  );
  aoa.push([
    "Total",
    "",
    r.totalCarteira,
    Math.round(r.totalHoras),
    Math.round(r.totalDias),
    1,
    Math.round(r.mediaVazao),
    Math.round(r.producaoDia),
  ]);
  aoa.push([], ["Média ponderada da vazão/h necessária", Math.round(r.mediaVazao)]);
  aoa.push(["Média ponderada produção/dia necessário (kg)", Math.round(r.producaoDia)]);
  aoa.push([], ["Horas do mês", c.mes], ["Horas por dia", c.horasDia]);
  aoa.push(
    ["Dias normais (seg. a sáb., sem feriados)", h.diasNormais],
    ["Horas disponíveis", h.horasNormais],
  );
  aoa.push(["Domingos/feriados trabalhados", c.extras], ["Horas extras", h.horasExtras]);
  aoa.push(
    ["Horas totais a trabalhar", h.horasTotais],
    ["Horas necessárias (carteira)", Math.round(r.totalHoras)],
  );
  aoa.push(
    [h.atende ? "Sobram horas" : "Faltam horas", Math.round(Math.abs(h.saldo))],
    ["Ocupação", +h.ocupacao.toFixed(4)],
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Resultado");
  XLSX.writeFile(wb, "resultado-carteira.xlsx");
}

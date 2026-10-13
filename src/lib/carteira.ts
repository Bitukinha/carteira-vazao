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

export function exportar(r: ReturnType<typeof calcular>) {
  const aoa: (string | number)[][] = [["Produto", "Vazão/h", "Carteira", "Hrs necessárias", "Dias necessários", "Representatividade", "Média pond. vazão/h necessária", "Média pond. produção/dia necessária (kg)"]];
  r.calc.forEach((l) => aoa.push([l.produto, l.vazao, l.carteira, +l.horas.toFixed(1), +l.dias.toFixed(1), +l.rep.toFixed(4), Math.round(l.vazaoPond), Math.round(l.prodDiaPond)]));
  aoa.push(["Total", "", r.totalCarteira, Math.round(r.totalHoras), Math.round(r.totalDias), 1, Math.round(r.mediaVazao), Math.round(r.producaoDia)]);
  aoa.push([], ["Média ponderada da vazão/h necessária", Math.round(r.mediaVazao)]);
  aoa.push(["Média ponderada produção/dia necessário (kg)", Math.round(r.producaoDia)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Resultado");
  XLSX.writeFile(wb, "resultado-carteira.xlsx");
}

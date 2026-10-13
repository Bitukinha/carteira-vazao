import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { PRODUTOS, calcular, exportar } from "@/lib/carteira";
import { carregarEstado, salvarEstado, type Estado } from "@/lib/estado";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nutrimilho · Cálculo de Carteira" },
      { name: "description", content: "Informe a carteira de cada produto e calcule horas, dias e produção necessária." },
      { property: "og:title", content: "Nutrimilho · Cálculo de Carteira" },
      { property: "og:description", content: "Informe a carteira de cada produto e calcule horas, dias e produção necessária." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    try {
      return { estado: await carregarEstado(), erro: false };
    } catch (e) {
      console.error(e);
      return { estado: null, erro: true };
    }
  },
  component: Index,
});

const n0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

const parseQtd = (s: string): number => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return isFinite(n) && n > 0 ? n : 0;
};

const vazaoPadrao = (): Record<string, string> =>
  Object.fromEntries(PRODUTOS.map((p) => [p.produto, n0.format(p.vazao)]));

type Status = "salvo" | "salvando" | "erro" | "pendente";

function Index() {
  const inicial = Route.useLoaderData();
  const [qtd, setQtd] = useState<Record<string, string>>(inicial.estado?.carteira ?? {});
  const [vazao, setVazao] = useState<Record<string, string>>(() => ({
    ...vazaoPadrao(),
    ...inicial.estado?.vazao,
  }));
  const [status, setStatus] = useState<Status>(inicial.erro ? "erro" : "salvo");

  // Salva no banco 700ms depois da última alteração.
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    setStatus("pendente");
    const dados: Estado = { vazao, carteira: qtd };
    const t = setTimeout(() => {
      setStatus("salvando");
      salvarEstado({ data: dados })
        .then(() => setStatus("salvo"))
        .catch((e) => {
          console.error(e);
          setStatus("erro");
        });
    }, 700);
    return () => clearTimeout(t);
  }, [vazao, qtd]);

  const zerar = () => {
    setQtd({});
    setVazao(vazaoPadrao());
  };

  const linhas = PRODUTOS.map((p) => ({
    produto: p.produto,
    vazao: parseQtd(vazao[p.produto] ?? ""),
    carteira: parseQtd(qtd[p.produto] ?? ""),
  }));
  const r = calcular(linhas);
  const temDados = r.totalCarteira > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <img src="/nutrimilho-logo.png" alt="Nutrimilho" className="h-12 rounded-lg bg-white px-2 py-1" />
          <ThemeToggle />
        </div>
        <div className="h-1 bg-brand-stripe" />
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">Cálculo de Carteira</h1>
            <p className="mt-2 text-muted-foreground">
              Informe a carteira e a vazão/h de cada produto. Horas, dias e representatividade calculam na hora.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusSalvo status={status} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-full border border-destructive px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Zerar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Zerar todos os valores?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As carteiras serão apagadas e as vazões voltarão ao padrão. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={zerar}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Zerar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Produto</th>
                <th className="px-4 py-3 text-right font-semibold">Vazão/h</th>
                <th className="px-4 py-3 text-right font-semibold">Carteira</th>
                <th className="px-4 py-3 text-right font-semibold">Hrs necessárias</th>
                <th className="px-4 py-3 text-right font-semibold">Dias necessários</th>
                <th className="px-4 py-3 text-right font-semibold">Representativ.</th>
                <th className="px-4 py-3 text-right font-semibold">Média pond. vazão/h</th>
                <th className="px-4 py-3 text-right font-semibold">Média pond. prod./dia (kg)</th>
              </tr>
            </thead>
            <tbody>
              {r.calc.map((l) => (
                <tr key={l.produto} className="border-t border-border even:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{l.produto}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={vazao[l.produto] ?? ""}
                      onChange={(e) => setVazao((q) => ({ ...q, [l.produto]: e.target.value }))}
                      placeholder="0"
                      className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-right text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={qtd[l.produto] ?? ""}
                      onChange={(e) => setQtd((q) => ({ ...q, [l.produto]: e.target.value }))}
                      placeholder="0"
                      className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-right text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">{l.carteira > 0 ? n1.format(l.horas) : "—"}</td>
                  <td className="px-4 py-3 text-right">{l.carteira > 0 ? n1.format(l.dias) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-accent" style={{ width: `${l.rep * 100}%` }} />
                      </div>
                      {l.carteira > 0 ? pct.format(l.rep) : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{l.carteira > 0 ? n0.format(l.vazaoPond) : "—"}</td>
                  <td className="px-4 py-3 text-right">{l.carteira > 0 ? n0.format(l.prodDiaPond) : "—"}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary font-bold text-primary">
                <td className="px-4 py-3">Total</td>
                <td />
                <td className="px-4 py-3 text-right">{n0.format(r.totalCarteira)}</td>
                <td className="px-4 py-3 text-right">{temDados ? n0.format(r.totalHoras) : "—"}</td>
                <td className="px-4 py-3 text-right">{temDados ? n0.format(r.totalDias) : "—"}</td>
                <td className="px-4 py-3 text-right">{temDados ? "100%" : "—"}</td>
                <td className="px-4 py-3 text-right">{temDados ? n0.format(r.mediaVazao) : "—"}</td>
                <td className="px-4 py-3 text-right">{temDados ? n0.format(r.producaoDia) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {temDados && (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Kpi label="Média ponderada da vazão/h necessária" value={n0.format(r.mediaVazao)} />
              <Kpi label="Média ponderada produção/dia necessária (kg)" value={n0.format(r.producaoDia)} accent />
            </div>
            <button
              onClick={() => exportar(r)}
              className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Baixar resultado em Excel
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function StatusSalvo({ status }: { status: Status }) {
  const txt = {
    salvo: "Salvo",
    salvando: "Salvando…",
    pendente: "Alterações não salvas",
    erro: "Erro ao salvar",
  }[status];
  const cor = status === "erro" ? "bg-destructive" : status === "salvo" ? "bg-primary" : "bg-accent";
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${cor}`} />
      {txt}
    </span>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const alternar = () => {
    const novo = !dark;
    setDark(novo);
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "dark" : "light");
    } catch {
      // armazenamento indisponível: o tema vale só para esta visita
    }
  };

  return (
    <button
      onClick={alternar}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo noturno"}
      title={dark ? "Modo claro" : "Modo noturno"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm ${accent ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
      <p className="text-sm opacity-90">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value}</p>
    </div>
  );
}

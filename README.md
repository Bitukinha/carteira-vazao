# Nutrimilho · Carteira de Pedidos + Vazão

App web (PWA) para calcular horas, dias e produção necessária a partir da carteira e da vazão/h de cada produto.
Os valores digitados são salvos automaticamente num banco PostgreSQL (Neon).

Stack: TanStack Start (React 19) + Vite + Tailwind 4 + Nitro, deploy na Vercel.

## Rodar localmente

```sh
cp .env.example .env   # e coloque a DATABASE_URL do Neon
npm install
npm run dev
```

A tabela `carteira_estado` é criada automaticamente na primeira requisição.

## Deploy na Vercel

1. Importe o repositório na Vercel (framework detectado: Vite / “Other”; build `npm run build`).
2. Em **Settings → Environment Variables**, adicione `DATABASE_URL` com a connection string do Neon.
3. Deploy. O Nitro detecta a Vercel (`VERCEL=1`) e gera `.vercel/output` automaticamente.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run preview` — roda o build localmente
- `npm test` — testes

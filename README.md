# Coinvera — Digital Asset Exchange (Interactive Prototype)

**React + TypeScript + Tailwind CSS · English-first, multilingual (EN / 中文 / 日本語 / 한국어) · light & dark themes**

Coinvera is a fully interactive front-end prototype of a digital-asset exchange —
spot trading, USDT-margined perpetual futures, fiat channels, a three-tier broker
(referral) program, asset management, and a complete back-office console. All data
is deterministic mock data; there is no backend.

> Live demo: **https://coinvera.aicloud.co.nz**

---

## Highlights

- **Spot & Futures terminals** — TradingView candlestick charts, live order book and
  depth, 125× leverage, cross/isolated margin, tiered margin, mark/index price,
  funding rate, insurance fund and ADL indicators, TP/SL, GTC/IOC/FOK.
- **Full account flows** — registration, login with 2FA, KYC (with a pure-front-end
  biometric-unlock demo), API-key management, security center, referral/rebate.
- **Assets** — deposit, withdraw, transfer, fund flow, orders and trade history.
- **Admin console** — 73 back-office pages grouped exactly as the source spec.
- **Feature coverage page** (`/coverage`) — every feature point mapped to the screen
  that implements it.
- **Internationalization** — English by default, switchable to 中文 / 日本語 / 한국어,
  built on a compile-time extraction + `t()` runtime (see `i18n/`).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/  (static, SPA)
npm run preview    # serve the build
```

The build is a static SPA: any web server must fall back unknown routes to
`index.html`.

## Internationalization

Source strings are Chinese; translations live in `src/locales/{en,ja,ko}.json`.
A Vite plugin (`i18n/transform.mjs`) wraps every render-time Chinese literal in a
`t()` call at build time; `t()` resolves the active language and falls back
`lang → en → source` so an incomplete dictionary degrades gracefully. English is
the default language.

```bash
node i18n/extract.mjs   # rebuild the source key list + locale skeletons
node i18n/apply.mjs      # merge staged translations into src/locales/*.json
```

## Tech

Vite · React 18 · React Router · Tailwind CSS · TradingView Lightweight Charts ·
lucide-react.

## Deployment

A container image (`nginx:alpine` serving `dist/`) and compose file live in
[`deploy/`](deploy/). See [`deploy/README.md`](deploy/README.md).

# QuickImgConvert v2 — Public Frontend (`web/`)

Next.js 14 + TypeScript (strict) + Tailwind CSS. Sirf 2 tarah ke pages: homepage (`/`) aur 210 format pages (`/convert/[from]-to-[to]/`). Koi blog/about/contact nahi.

## Chalane ka tareeqa (local)

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

Backend API `http://localhost:8000` par chalna chahiye (Docker). Agar API down ho to catalog local data (`lib/formats.ts`) se ata hai — site khali nahi rehti.

`.env.local` me:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Structure

```
app/
  page.tsx                 homepage: hero + converter + explorer + how + FAQ
  convert/[pair]/page.tsx  210 pages, generateStaticParams se
  layout.tsx               fonts, header/footer, JSON-LD
components/
  ConverterTool.tsx        upload -> POST /v1/uploads -> POST /v1/convert
                           -> poll /v1/jobs/{id} -> signed download
  SettingFields.tsx        output_settings render (select/range/number/boolean/color)
  UsageBanner.tsx          GET /v1/me — plan/usage, backend ka text, hardcode nahi
  FormatExplorer.tsx       IMAGES (+RAW chips) / AUDIO / VIDEO — 210 links
  HowItWorks.tsx  Faq.tsx  RelatedPairs.tsx  SiteHeader.tsx  SiteFooter.tsx
lib/
  formats.ts               32 formats; 210 pairs targets se derive hote hain
  api.ts                   API client + offline fallback
```

## Design tokens

Sab colors/spacing `tailwind.config.ts` ke tokens se: `ink`, `panel`, `acid` (lime), `iris` (violet), `ember`, `cyanx`, `mist`, `paper`. Dark-first theme.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
```

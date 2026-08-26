# JARVIS CORE · HUD de Gestão para Salão de Beleza

Dashboard futurista estilo *Sci-Fi HUD* (mapa de nós orbitais) para gestão de salão
de beleza profissional. Núcleo luminoso central, módulos em órbita, painel de voz
com waveform reativa e log de comandos.

![stack](https://img.shields.io/badge/Next.js-App_Router-0a2740) ![ts](https://img.shields.io/badge/TypeScript-strict-0a2740) ![tw](https://img.shields.io/badge/Tailwind-3.4-0a2740)

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript) |
| Estilo | Tailwind CSS 3.4 com design tokens próprios |
| Ícones | `lucide-react` |
| Animação de UI | Framer Motion (nós, painéis, transições) |
| Animação de partícula/onda | HTML5 Canvas (fundo, núcleo e waveform) |

A divisão é proposital: **Framer Motion** cuida do que é interativo e discreto
(entrada dos nós, gaveta, barras de métrica); **Canvas** cuida do que é contínuo e
denso (centenas de partículas e barras de áudio a 60 fps), para não criar centenas
de nós no DOM.

## Rodando

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Estrutura

```
app/
  layout.tsx              Fontes (Orbitron/Share Tech Mono/Inter), metadata, tema
  page.tsx                Monta o dashboard
  globals.css             Reset, fundo, classes .hud-panel / .hud-corners / .text-glow
components/hud/
  JarvisDashboard.tsx     Casca: estado do núcleo, módulo ativo, voz, atalhos
  JarvisHeader.tsx        JARVIS CORE ONLINE, data/hora, clima, Obsidian Vault
  StatusPill.tsx          Bloco atômico do header
  OrbitalMap.tsx          Geometria das órbitas, linhas de conexão, fallback compacto
  CoreOrb.tsx             Núcleo luminoso + enxame de partículas (canvas)
  OrbitNode.tsx           Nó orbital interativo
  ModulePanel.tsx         Rail de detalhe do módulo + visão geral + resumo do turno
  MetricGauge.tsx         Cartão de métrica com barra e variação
  VoiceHUD.tsx            Painel inferior: waveform, botão de mic, log
  AudioWaveform.tsx       Barras de áudio (canvas), reais ou sintéticas
  CommandLog.tsx          Log de comandos recentes
  ParticleField.tsx       Campo de partículas do fundo
lib/
  modules.ts              Modelo de dados dos 8 módulos (fonte única da verdade)
  useClock.ts             Relógio em tempo real (sem mismatch de SSR)
  useWeather.ts           Clima local (simulado — troque pelo seu provedor)
  useVaultSync.ts         Status do Obsidian Local Vault
  useCommandLog.ts        Buffer circular de eventos
  useMicLevel.ts          Captura de áudio via Web Audio API
  useElementSize.ts       Medição do palco para o layout orbital
```

## Módulos orbitais

Os 8 nós vivem em `lib/modules.ts` — label, tagline, ícone, cor de acento, status,
anel orbital, métricas e feed. Adicionar um módulo é adicionar um item ao array;
o mapa, o rail e a visão geral se ajustam sozinhos.

| Módulo | Escopo |
| --- | --- |
| CLIENTES | Prontuário, histórico de químicas, preferências |
| FINANCEIRO | Faturamento, margem, comissões, fluxo de caixa |
| MARKETING | Campanhas WhatsApp, retenção, promoções |
| AGENDAS | Ocupação das bancadas, encaixes, grade da equipe |
| ESTOQUE | Previsão de uso de produtos, alertas de falta |
| METAS | Desempenho da equipe e faturamento diário |
| HISTÓRICO QUÍMICO | Fórmulas, compatibilidade, segurança química |
| VISAGISMO | Formato de rosto, colorimetria, proposta |

## Interação

| Ação | Resultado |
| --- | --- |
| Clique em um nó | Abre a telemetria do módulo no rail (gaveta abaixo de `xl`) |
| Clique no núcleo | Alterna STANDBY ↔ LISTENING |
| `Espaço` | Alterna o microfone |
| `Esc` | Fecha o módulo aberto |

## Áudio

`useMicLevel` pede permissão de microfone e alimenta a waveform com o espectro real
via `AnalyserNode`. Sem permissão — ou sem suporte — o canvas cai numa onda sintética
e o HUD segue funcionando; o rótulo ao lado de "AUDIO INPUT" diz qual modo está ativo.

## Responsividade

- **≥ 1280px** — mapa orbital + rail de módulo lado a lado.
- **720–1279px** — mapa orbital em tela cheia; o módulo abre como gaveta com scrim.
- **< 720px** — o mapa vira grade tocável (os rótulos não caberiam sem colidir),
  núcleo e Voice HUD permanecem.

## Dados

Os números são *mock* declarados em `lib/modules.ts`, com o formato final da UI já
definido (`ModuleMetric`, `SalonModule`). Para plugar dados reais, troque a fonte do
array por um fetch/server component mantendo os mesmos tipos — nenhum componente de
apresentação precisa mudar. O mesmo vale para `useWeather` e `useVaultSync`.

## Acessibilidade

Todos os nós são `<button>` com `aria-pressed`, foco visível e navegação por teclado;
elementos puramente decorativos são `aria-hidden`. `prefers-reduced-motion` desliga
as animações de CSS, o drift das partículas e os pulsos que viajam nas conexões.

---

Os arquivos `reativacao2.html`, `reativacao3.html` e `ONDA2_app.html` na raiz são as
ferramentas de campanha já existentes e seguem intactos.

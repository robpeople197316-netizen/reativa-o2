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
  CampaignConsole.tsx     Console da Onda 2 dentro do painel de MARKETING
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
  campaign/
    onda2.ts              Tipos + chave de progresso compartilhada
    onda2.server.ts       Parser que lê o ONDA2_app.html
    useOnda2.ts           Campanha completa (contatos, envio, progresso)
    useOnda2Progress.ts   Leitura barata do progresso, sem baixar a base
  useClock.ts             Relógio em tempo real (sem mismatch de SSR)
  useWeather.ts           Clima local (simulado — troque pelo seu provedor)
  useVaultSync.ts         Status do Obsidian Local Vault
  useCommandLog.ts        Buffer circular de eventos
  useMicLevel.ts          Captura de áudio via Web Audio API
  useElementSize.ts       Medição do palco para o layout orbital
  useMediaQuery.ts        Decide entre rail e gaveta (monta só um dos dois)
app/api/campanha/onda2/   Rota estática que serve a base da campanha
```

## Módulos orbitais

Os 8 nós vivem em `lib/modules.ts` — label, tagline, ícone, cor de acento, status,
anel orbital, métricas e feed. Adicionar um módulo é adicionar um item ao array;
o mapa, o rail e a visão geral se ajustam sozinhos.

| Módulo | Escopo |
| --- | --- |
| CLIENTES | Prontuário, histórico de químicas, preferências |
| FINANCEIRO | Faturamento, margem, comissões, fluxo de caixa |
| MARKETING | **Campanha real Onda 2** — ver abaixo |
| AGENDAS | Ocupação das bancadas, encaixes, grade da equipe |
| ESTOQUE | Previsão de uso de produtos, alertas de falta |
| METAS | Desempenho da equipe e faturamento diário |
| HISTÓRICO QUÍMICO | Fórmulas, compatibilidade, segurança química |
| VISAGISMO | Formato de rosto, colorimetria, proposta |

## MARKETING · a campanha Onda 2 é real

O nó MARKETING não tem números *mock*: ele lê o **`ONDA2_app.html`** da raiz do
repositório. `lib/campaign/onda2.server.ts` extrai do script daquele arquivo os
598 contatos (`var D`), o template da mensagem (`var TMPL`), o preset de
enviadas (`var PRESET`) e o teto diário do texto de instrução — sem etapa de
geração de código. **O HTML continua sendo a fonte da verdade:** edite a base lá
e o HUD acompanha no próximo build (em `dev`, no próximo request).

Abrir o módulo dá o console completo da campanha: 12 lotes, progresso da onda,
lista de contatos e disparo que abre o WhatsApp com o template preenchido
(`wa.me/<fone>?text=…`), exatamente como o app original.

### Progresso compartilhado

O console grava na **mesma chave de `localStorage` (`onda2`) e no mesmo formato**
do `ONDA2_app.html`. Na prática:

- o progresso já existente no navegador aparece no HUD na primeira abertura;
- marcar uma mensagem como enviada em qualquer um dos dois aparece no outro
  (mesma aba via evento interno, outras abas via evento `storage`);
- quem nunca usou o app recebe o preset original (lotes 1 e 2, 100 enviadas).

> **Herança a conhecer:** o progresso é indexado pela *posição* do contato na
> lista, não pelo telefone — é como o app em HTML sempre funcionou, e mudar isso
> descartaria o histórico de quem já está usando. Reordenar a base invalida o
> progresso salvo. Quando a base virar banco de dados, migre a chave para o
> telefone.

### Custo de carga

Os ~600 contatos **não** entram no HTML inicial. O que o servidor manda de cara
são só os totais (`loadOnda2Summary`), suficientes para o LED do nó e o "Resumo
do turno"; a base completa é buscada em `/api/campanha/onda2` apenas quando o
módulo é aberto. Como rail e gaveta mostram o mesmo painel, apenas um dos dois é
montado por vez (`useMediaQuery`) — do contrário a base seria baixada em dobro.

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

MARKETING roda com dados reais (seção acima). Os outros sete módulos ainda são
*mock* declarado em `lib/modules.ts`, com o formato final da UI já definido
(`ModuleMetric`, `SalonModule`). Para plugar dados reais, troque a fonte do
array por um fetch/server component mantendo os mesmos tipos — nenhum componente de
apresentação precisa mudar. O mesmo vale para `useWeather` e `useVaultSync`.

## Acessibilidade

Todos os nós são `<button>` com `aria-pressed`, foco visível e navegação por teclado;
elementos puramente decorativos são `aria-hidden`. `prefers-reduced-motion` desliga
as animações de CSS, o drift das partículas e os pulsos que viajam nas conexões.

---

`ONDA2_app.html` segue intacto e continua funcionando sozinho — agora ele também
alimenta o HUD. `reativacao2.html` e `reativacao3.html` permanecem como estavam.

# JARVIS CORE · HUD de Gestão para Salão de Beleza

Dashboard futurista estilo *Sci-Fi HUD* (mapa de nós orbitais) para gestão de salão
de beleza profissional. Núcleo luminoso central, módulos em órbita, painel de voz
com waveform reativa e log de comandos.

![stack](https://img.shields.io/badge/Next.js-App_Router-0a2740) ![ts](https://img.shields.io/badge/TypeScript-strict-0a2740) ![tw](https://img.shields.io/badge/Tailwind-3.4-0a2740)

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript) |
| Cérebro | Claude Opus 5 via `@anthropic-ai/sdk` (tool use + visão + busca web) |
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
  jarvis/
    JarvisConsole.tsx     Painel de controle: abas, visão e entrada de texto
    CapabilityLeds.tsx    Fita de status das quatro capacidades
    Transcript.tsx        Conversa, com ferramentas usadas e fontes citadas
    LembretesPanel.tsx    Lembretes do dia: criar, ver e concluir
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
  jarvis/hooks/
    useLembretes.ts       Lista de lembretes para o painel
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

## O cérebro do Jarvis

O HUD deixou de ser só painel: o microfone conduz um ciclo **ouvir → pensar →
falar**, com o cofre Obsidian como memória e ferramentas reais para agir.

### Configuração

Copie `.env.example` para `.env.local`. **Nada é obrigatório** — cada capacidade
liga sozinha quando a chave existe, e o que falta degrada de forma explícita:

| Variável | Sem ela |
| --- | --- |
| `OBSIDIAN_VAULT_PATH` | usa `./jarvis-vault` no projeto (teste, não produção) |
| `ANTHROPIC_API_KEY` | conversa, visão e pesquisa web ficam offline; o HUD avisa no log |
| `OPENAI_API_KEY` | transcrição cai para a Web Speech API do navegador |
| `ELEVENLABS_API_KEY` ou `GOOGLE_TTS_API_KEY` | fala cai para o `speechSynthesis` do sistema |

`GET /api/jarvis/status` responde o que está ligado — só booleanos, nenhuma
chave sai do servidor. É por ele que os hooks escolhem Whisper ou Web Speech,
ElevenLabs ou voz nativa.

### Ponte com o Obsidian

`lib/jarvis/obsidian/` escreve Markdown de verdade, com frontmatter YAML, na
estrutura pedida:

```
/Clientes     ficha por cliente — tags (#loira, #progressiva, #preferencia_cafe),
              alertas químicos, preferências e histórico químico datado
/Financeiro   um arquivo por dia — entradas, saídas e comissões, com os totais
              recalculados no frontmatter a cada lançamento
/Diario       log de atendimento + lembretes com hora, no frontmatter
```

Três decisões que valem conhecer:

- **Escrita aditiva.** `upsertCliente` soma tags, preferências e histórico ao que
  já existe e preserva as seções que o profissional escreveu à mão. Uma conversa
  de voz nunca deve apagar prontuário por engano.
- **Totais recalculados, não incrementados.** O financeiro relê as linhas do
  arquivo e refaz as somas. Se alguém corrigir um valor direto no Obsidian, o
  frontmatter continua honesto.
- **Nada escreve fora do cofre.** Todo caminho passa por `resolveInVault`, que
  rejeita qualquer coisa que escape da raiz, e nomes viram slug antes de virar
  arquivo. Uma travessia devolve 400, não 500 — é entrada inválida.

### Ferramentas do cérebro

O modelo não fala com o disco: chama ferramentas que são pontes para os módulos
já testados. `buscar_cliente`, `salvar_cliente`, `registrar_financeiro`,
`consultar_financeiro`, `calcular`, `registrar_diario`, `criar_lembrete` e
`listar_lembretes`, todas com `strict: true`.

A **pesquisa web** não é integração de terceiro: usa a ferramenta de servidor
`web_search` da própria Anthropic, que roda do lado deles e volta com as fontes
no mesmo response — uma chave a menos para administrar. O prompt manda citar a
fonte e **proíbe estimar preço de fornecedor como se fosse pesquisado**.

### Voz e visão

| Hook | O que faz |
| --- | --- |
| `useSpeechRecognition` | Web Speech API ou gravação + Whisper, escolhido pelo status |
| `useSpeechSynthesis` | voz do servidor com queda automática para a do sistema |
| `useWebcam` | abre a câmera **só no instante da captura**, tira um quadro e fecha |
| `useScreenCapture` | Screen Capture API para o Jarvis ler a tela atual |
| `useJarvis` | orquestra tudo: status, ciclo de voz, histórico e lembretes |

A visão manda o quadro para `/api/jarvis/vision/analyze`, que roda o mesmo
cérebro com as ferramentas disponíveis — então o Jarvis cruza o que vê na
cadeira com o histórico químico da cliente antes de opinar.

### Conversa contínua

Ligada no console, a escuta reabre sozinha por **8 segundos** depois de cada
resposta — dá para emendar sem tocar em nada, que é o que importa com a mão na
tinta. A preferência fica salva no navegador.

Duas coisas sustentam isso:

- **O microfone nunca fica aberto enquanto o Jarvis fala.** `say()` fecha a
  escuta antes de sintetizar e a janela só reabre depois do fim da fala. Sem
  isso ele se ouve e responde a si mesmo, em laço.
- **A janela fecha sozinha.** Oito segundos, não "até você desligar". Num salão
  há cliente na cadeira, e microfone aberto sem motivo é constrangimento, não
  recurso. O rodapé mostra `AGUARDANDO` e o console pisca "ouvindo" enquanto
  ela dura.

No modo Whisper a janela é também a duração da gravação, então cada
acompanhamento sem fala custa uma transcrição. Com a fala do navegador não há
esse custo.

### A voz tem três caminhos

`/api/jarvis/voice/speak` é uma rota só, com dois provedores atrás dela —
**ElevenLabs** e **Google Cloud Text-to-Speech**. Quem chama recebe `audio/mpeg`
e não sabe qual respondeu; `resolveTtsProvider()` decide no servidor. Sem chave
nenhuma a rota devolve 503 e o navegador assume com a voz do sistema.

Essa terceira via é a mais frágil das três, e por um motivo que só aparece na
máquina do salão: ela depende de haver uma voz em português **instalada no
Windows**, o que nem sempre é o caso. Quando não há, o HUD diz onde instalar em
vez de ficar mudo. É esse buraco que a voz de servidor fecha.

Duas decisões do lado do Google:

- **Nome de voz errado não emudece.** Catálogos mudam. Se o Google recusar o
  nome com 400, o Jarvis repete o pedido só com `languageCode: pt-BR` e deixa
  ele escolher.
- **Preferência só vale com a chave.** Pedir `JARVIS_TTS_PROVIDER=elevenlabs`
  sem a chave dela cai no Google — o HUD nunca anuncia uma voz que não entrega.

### Lembretes com gatilho

Lembretes com horário vivem no frontmatter do dia. `GET /api/jarvis/lembretes?vencidos=1`
devolve os que venceram **e os marca como disparados** — efeito colateral de
propósito, para o HUD não repetir o mesmo alarme a cada varredura (uma por
minuto). Ao vencer, o Jarvis fala.

### Rotas

| Rota | Método | Para quê |
| --- | --- | --- |
| `/api/jarvis/status` | GET | capacidades ativas e caminho do cofre |
| `/api/jarvis/chat` | POST | uma volta de conversa, com ferramentas |
| `/api/jarvis/vision/analyze` | POST | diagnóstico de webcam ou leitura de tela |
| `/api/jarvis/voice/transcribe` | POST | áudio → texto (Whisper) |
| `/api/jarvis/voice/speak` | POST | texto → áudio (ElevenLabs) |
| `/api/jarvis/obsidian/clientes` | GET/POST | buscar e gravar fichas |
| `/api/jarvis/obsidian/financeiro` | GET/POST | caixa do dia e consolidado |
| `/api/jarvis/obsidian/diario` | GET/POST | log de atendimento |
| `/api/jarvis/lembretes` | GET/POST/PATCH | lembretes e gatilhos |
| `/api/jarvis/finance` | POST | ticket médio, comissão, margem por grama |

### ⚠️ As rotas não têm autenticação

Elas leem e escrevem no disco do salão e gastam crédito de API. Isso é aceitável
numa máquina local, que é o caso de uso pretendido. **Antes de expor este app em
qualquer rede**, coloque autenticação na frente de `/api/jarvis/*` — hoje quem
alcança a porta 3000 alcança o cofre.

### O que foi verificado

Testado de ponta a ponta neste ambiente: escrita e leitura do cofre nas três
pastas, upsert aditivo, recálculo dos totais, gatilho de lembrete disparando uma
única vez, os três cálculos financeiros, bloqueio de travessia de caminho e a
degradação explícita de cada capacidade sem chave.

No painel: as três larguras sem overflow, criação de lembrete chegando ao
arquivo do cofre, e a captura de webcam anexando, enviando e aparecendo na
transcrição (com câmera falsa do navegador).

O **laço de ferramentas** foi verificado contra um servidor falso no lugar da
API: confirmou que a requisição sai com `thinking: adaptive`, `effort` em
`output_config`, as ferramentas com `strict` e os `tool_result` numa única
mensagem — e que a ferramenta executa e grava no cofre.

Não foi possível testar contra os serviços reais: **este ambiente não tem
credenciais de Anthropic, OpenAI nem ElevenLabs**. As chamadas ao modelo, ao
Whisper e à ElevenLabs seguem o contrato documentado de cada uma, mas nenhuma
foi exercida de verdade.

## O painel de controle

O botão **CONSOLE** no cabeçalho (ou a tecla **J**) abre o painel do Jarvis. Ele
reúne o que antes só existia na API.

### Onde ele aparece

| Largura | Comportamento |
| --- | --- |
| ≥ 1536px | terceira coluna fixa: console · mapa orbital · módulos |
| < 1536px | gaveta pela esquerda, com scrim sobre o mapa |

O corte é em 1536px, não em 1280: com três colunas num monitor menor o mapa
orbital ficaria abaixo do limite de 720px e cairia na grade compacta — o HUD
perderia justamente o que ele é.

### O que tem dentro

**Fita de capacidades** — quatro LEDs: cérebro, ouvido, voz e cofre. Verde não
quer dizer "melhor": ouvido e voz funcionam desligados, só por outro caminho, e
o rótulo diz qual (`usando a fala do navegador`, `usando a voz do sistema`). Só
cérebro e cofre acendem vermelho, porque sem eles não há o que fazer. O caminho
do cofre aparece embaixo.

**Conversa** — a transcrição mostra cada turno e, sob as respostas, **as
ferramentas que foram usadas** e **as fontes citadas** quando houve pesquisa
web. Dá para auditar de onde veio cada afirmação sem abrir o log.

**Visão** — os dois botões capturam webcam ou tela e **anexam o quadro à
conversa**, em vez de abrir um diálogo paralelo: assim o Jarvis cruza o que vê
com o histórico da cliente. O anexo fica fixado até você removê-lo, e a
miniatura visível avisa que ele está indo junto — perguntas de acompanhamento
sobre a mesma foto continuam funcionando.

**Lembretes** — os do dia, com criação rápida (texto + hora) e conclusão. O
disparo em voz alta continua sendo do `useJarvis`; esta aba é a lista visível.
Os dois leem o mesmo arquivo do cofre.

### Transcrição e contexto são coisas diferentes

A transcrição guarda tudo, inclusive as falhas, marcadas em âmbar. O contexto
mandado ao modelo guarda só os turnos que deram certo, e só texto. Sem essa
separação, ou um erro de rede apagaria a pergunta da tela, ou `Erro: status 502`
entraria no histórico como se fosse resposta do assistente.

Imagem vai na rodada dela, nunca no histórico — por isso o anexo fica fixado.

### Atalhos

| Tecla | Ação |
| --- | --- |
| `J` | abre e fecha o console |
| `Espaço` | alterna o microfone |
| `Esc` | fecha o console; com ele fechado, fecha o módulo aberto |

## Interação

| Ação | Resultado |
| --- | --- |
| Clique em um nó | Abre a telemetria do módulo no rail (gaveta abaixo de `xl`) |
| Clique no núcleo | Alterna STANDBY ↔ LISTENING |
| Botão CONSOLE / `J` | Abre o painel de controle do Jarvis |

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

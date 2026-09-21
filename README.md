# Portfólio — Leonardo Martinelli

Portfólio criativo 2026. HTML, CSS e JavaScript puros — sem build, sem dependências, sem CDN
(fontes e imagens são locais).

## Rodar localmente

```bash
php -S localhost:8000      # ou: python3 -m http.server 8000
```

Abra <http://localhost:8000>. Também funciona abrindo `index.html` direto, mas um servidor
local é mais fiel ao ambiente real.

## O que tem no site

| Seção | Ideia |
|---|---|
| Abertura | Loader em forma de claquete e hero com o boneco de feltro sobre o nome em cromado |
| Sobre | Manifesto que "acende" palavra por palavra conforme o scroll |
| Trajetória | Fita de filme rolando na horizontal; cada cena é um plano de câmera (geral, médio, close, detalhe) |
| Stack | Editor de código que se escreve sozinho com o scroll (PHP → JavaScript) |
| Lente | Foco puxado pelo scroll (bokeh + visor de câmera com ISO, abertura e obturador) |
| Projetos | "Próximos lançamentos": pôsteres com inclinação 3D |
| Contato | Boneco espiando no rodapé |

Extras: cursor em forma de visor (só com mouse), efeito RGB nas manchetes ao rolar rápido,
grão de filme, HUD com timecode e nome da cena atual, respeito a `prefers-reduced-motion`.

Responsivo: celular, tablet (em pé e deitado), notebook e telas grandes.

## Estrutura

```
.
├── index.html          # conteúdo e marcação
├── css/style.css       # tokens, seções e media queries
├── js/main.js          # loop de scroll único (lê o layout, depois escreve variáveis CSS)
├── assets/leonardo.webp  # boneco recortado (fundo transparente)
└── fonts/              # Bricolage Grotesque, Instrument Serif, JetBrains Mono
```

## Editar o conteúdo

- **Projetos**: em `index.html`, seção `#projetos`, troque o conteúdo de cada `.poster` e o `href`.
- **Contatos**: em `index.html`, seção `#contato`, copie o botão `.btn` e ajuste o link
  (e-mail, LinkedIn, Instagram…).
- **Cores**: variáveis no topo de `css/style.css` (`--orange`, `--ember`, `--ink`…).
- **Trajetória**: cada `<article class="frame">`. O enquadramento do boneco é definido pelo
  `style="--k; --cx; --cy"` da imagem (zoom e ponto de foco).

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).

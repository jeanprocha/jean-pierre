# jean-pierre.dev — site pessoal

Site pessoal e portfólio de **Jean Pierre Rocha** — Desenvolvedor Full Stack Sênior
(Go · React · IA aplicada).

**No ar:** https://jean-pierre.vercel.app

## Stack

Sem framework e sem build: HTML, CSS e JavaScript puros, servidos estaticamente
pela Vercel.

| Arquivo | O que é |
|---|---|
| `index.html` | Página única — hero, stack, projetos e contato, com JSON-LD |
| `styles.css` | Estilos, com design tokens em custom properties |
| `main.js` | Interações, canvas de fundo, paleta de comandos, editor de interface e i18n (pt-BR / en) |
| `assets/` | Imagens, ícones e currículo em PDF |

## Detalhes

- **i18n** — o HTML está em pt-BR; `main.js` carrega o dicionário `en` sobre ele.
  Ao mudar um texto no HTML, atualize a chave correspondente em `I18N.en`.
- **Editor de interface** — o botão "Editar interface" abre um painel que permite
  ao visitante mudar tipografia, tamanho, tema, cor de destaque, bordas, animação e
  ordem das seções. As escolhas persistem em `localStorage`.
- **Paleta de comandos** — `Ctrl/Cmd + K`.
- **Acessibilidade** — navegação por teclado, `prefers-reduced-motion` respeitado,
  landmarks e rótulos ARIA.

## Rodar local

```bash
python3 -m http.server 8000
```

## Deploy

```bash
vercel --prod
```

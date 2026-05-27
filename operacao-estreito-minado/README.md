# OPERAÇÃO ESTREITO MINADO

> Um Campo Minado **satírico** ambientado no Estreito de Ormuz.
> Sátira política, estética cinematográfica de painel tático naval.
> HTML + CSS + JavaScript puros — **sem backend, sem frameworks, sem internet**.

---

## 🎯 Sobre o jogo

Minas diplomáticas foram espalhadas pelo Estreito de Ormuz e cabe a você atravessar o tabuleiro sem detonar uma. As regras são as do clássico Campo Minado, mas a embalagem é de uma operação naval ficcional: radar, varredura sonar, log de transmissões do comando e quatro "alvos" satíricos que reagem com explosões em estilo meme/cartum quando uma mina é acionada.

> **Aviso**: É uma obra de **ficção e sátira política**. Não representa nem incita eventos reais. As "explosões" são intencionalmente cartunescas, em estilo HQ.

---

## ▶️ Como rodar localmente

O projeto é 100% estático. Você tem **duas formas** de jogar:

### Opção A — Abrir direto no navegador
1. Baixe ou clone este repositório.
2. Dê duplo clique em `index.html`.
3. Pronto.

> Funciona offline. Não exige Node, Python, build, nada.

### Opção B — Servidor local (recomendado para evitar restrições de file://)
Alguns navegadores aplicam restrições ao protocolo `file://`. Se algo não carregar, use um servidor simples:

```bash
# Python 3
python3 -m http.server 8000

# Node (com npx)
npx serve .
```

Depois acesse `http://localhost:8000`.

---

## 🗂️ Estrutura do projeto

```
operacao-estreito-minado/
├── index.html          # Estrutura HTML (telas, HUD, modais)
├── style.css           # Toda a estética cinematográfica e responsiva
├── script.js           # Lógica do jogo, render, efeitos, áudio procedural
├── README.md           # Este arquivo
└── assets/
    ├── images/
    │   ├── strait-map.png      # Mapa 3D do Estreito de Ormuz (fundo principal)
    │   ├── strait-aerial.png   # Vista aérea alternativa (reserva)
    │   ├── trump.png           # Alvo satírico — Trump
    │   ├── vance.png           # Alvo satírico — JD Vance
    │   ├── rubio.png           # Alvo satírico — Marco Rubio
    │   └── hegseth.png         # Alvo satírico — Pete Hegseth
    ├── icons/                  # (reservado para ícones adicionais)
    └── sounds/                 # (vazio — sons são gerados via Web Audio API)
```

### Organização do `script.js`

O arquivo é dividido em seções comentadas:

| Seção | Conteúdo |
|---|---|
| §1 CONFIG | Dificuldades, pontuação, frases satíricas, alvos |
| §2 STATE | Estado global do jogo |
| §3 STORAGE | Persistência de recordes via `localStorage` |
| §4 AUDIO | Efeitos sonoros gerados em tempo real (Web Audio API) |
| §5 LOGIC | Geração do tabuleiro, posicionamento de minas, flood fill |
| §6 RENDER | Criação e atualização do DOM |
| §7 EFFECTS | Screen shake, flash vermelho, animação de explosão |
| §8 HUD / LOG | Pontuação, tempo, minas restantes, log de operações |
| §9 EVENT HANDLERS | Clique, clique direito, teclado, resize |
| §10 SCREEN FLOW | Telas inicial / jogo / vitória / derrota |
| §11 INIT | Inicialização da aplicação |

---

## 🎮 Como jogar

| Ação | Controle |
|---|---|
| Revelar zona | **Clique esquerdo** |
| Marcar suspeita de mina | **Clique direito** |
| Reiniciar partida | Botão **Reiniciar** ou tecla **R** |
| Voltar ao menu | Botão **Menu** |

**Números** indicam quantas minas existem nas 8 células ao redor. Use as bandeiras para marcar onde você acredita haver mina. Cuidado: **o primeiro clique nunca é uma mina** (regra clássica de campo minado).

### Modos de dificuldade

| Modo | Grid | Minas | Multiplicador |
|---|---|---|---|
| **Fácil** | 12 × 9 (108) | 12 | ×1 |
| **Médio** | 18 × 12 (216) | 35 | ×2 |
| **Crise Total** | 24 × 16 (384) | 80 | ×4 |

### Pontuação

- **+10 pts** por célula revelada
- **+2 pts × tamanho da sequência** (bônus por avanço sem erros)
- **+25 pts** por mina marcada corretamente (na vitória)
- **+500 × multiplicador** ao vencer
- **+5 pts por segundo restante** (até 5 minutos) ao vencer
- **−15 pts** por bandeira em local errado (na derrota)

Os recordes pessoais por dificuldade ficam salvos em `localStorage`.

---

## 🎨 Como trocar imagens

Todas as imagens vivem em `assets/images/`. Para personalizar:

1. **Mapa de fundo**: substitua `strait-map.png` por qualquer imagem (preferência por proporção 3:2 horizontal). Mantenha o mesmo nome ou edite as referências em:
   - `style.css` linhas que contêm `assets/images/strait-map.png`
2. **Alvos satíricos**: substitua qualquer um de `trump.png`, `vance.png`, `rubio.png`, `hegseth.png` mantendo o nome do arquivo.
3. **Quer adicionar mais alvos**? Edite a constante `TARGETS` em `script.js` (§1 CONFIG):

```js
const TARGETS = [
  { id: 'trump',   src: 'assets/images/trump.png',   weight: 50, line: 'Mina do Trump detonada. Twitter pegou fogo.' },
  // adicione mais entradas aqui...
];
```

E adicione em `DEFEAT_TITLES` e `DEFEAT_DESCS` no mesmo arquivo.

> Se uma imagem não carregar, o jogo automaticamente usa um placeholder SVG — nenhum crash.

---

## 🚀 Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex: `operacao-estreito-minado`).
2. Faça o push do conteúdo desta pasta para a branch `main`:

   ```bash
   git init
   git add .
   git commit -m "Operação Estreito Minado — primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/operacao-estreito-minado.git
   git push -u origin main
   ```

3. No GitHub, vá em **Settings → Pages**.
4. Em **Source**, selecione `Deploy from a branch`.
5. Escolha a branch `main` e a pasta `/ (root)`.
6. Salve. O GitHub gera uma URL pública em alguns segundos:
   `https://SEU_USUARIO.github.io/operacao-estreito-minado/`

Compartilhe o link e bom jogo.

---

## 🛠️ Decisões técnicas

- **Sem dependências externas.** Nada de CDN, fontes do Google, frameworks. Tudo roda offline.
- **Áudio procedural.** Os bipes de revelação, marcação e a explosão são gerados via Web Audio API. Nenhum arquivo de som necessário.
- **Mapa real do Estreito.** A imagem é tratada via `filter: saturate brightness contrast hue-rotate` no CSS para se integrar à paleta tática sem que pareça "colada".
- **Cells translúcidas.** Cada célula tem `backdrop-filter: blur` sutil e fundo translúcido, deixando o mapa naval visível por baixo do tabuleiro.
- **Flood fill.** Quando uma célula com zero minas vizinhas é clicada, as adjacentes são reveladas em cascata (algoritmo recursivo clássico).
- **Primeiro clique seguro.** As minas só são posicionadas **depois** do primeiro clique, garantindo que o jogador nunca perca de cara.
- **Acessibilidade básica.** Cada célula tem `role="gridcell"` e `aria-label` com coordenada náutica (A1, B2…). O log de transmissões usa `aria-live="polite"`.

---

## 📜 Aviso de sátira

Este projeto é uma **obra ficcional satírica**. As figuras públicas representadas aparecem em contexto de **caricatura/meme** com explosões em estilo HQ, sem qualquer apologia à violência. O objetivo é comentar geopolítica de forma irônica, na tradição de charges políticas. As imagens incluídas estão na pasta `assets/images/` e podem ser trocadas livremente (veja seção [Como trocar imagens](#-como-trocar-imagens)).

---

## 🪪 Licença

Código sob licença MIT — use, copie, modifique, distribua livremente. As imagens dos políticos são de domínio público / uso editorial; ao redistribuir, verifique as fontes originais conforme sua jurisdição.

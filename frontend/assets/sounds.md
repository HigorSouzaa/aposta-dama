# 🔊 Como Adicionar Sons ao Jogo

## Método 1: Usar arquivos de áudio locais (Recomendado)

### 1. Baixe sons gratuitos de:
- **Freesound.org** - https://freesound.org/
- **Zapsplat** - https://www.zapsplat.com/
- **Mixkit** - https://mixkit.co/free-sound-effects/

### 2. Tipos de sons necessários:
- `move.mp3` - Som de movimento de peça (clique suave)
- `capture.mp3` - Som de captura (som de "pop" ou "zap")
- `select.mp3` - Som de seleção (clique leve)
- `error.mp3` - Som de erro (buzz curto)
- `win.mp3` - Som de vitória (fanfarra)
- `lose.mp3` - Som de derrota (som triste)

### 3. Coloque os arquivos nesta pasta (`frontend/assets/`)

### 4. Atualize o código em `game.js`:

```javascript
// Trocar esta parte:
const sounds = {
  move: new Audio('data:audio/wav;base64...'),
  // ...
};

// Por esta:
const sounds = {
  move: new Audio('assets/move.mp3'),
  capture: new Audio('assets/capture.mp3'),
  select: new Audio('assets/select.mp3'),
  error: new Audio('assets/error.mp3'),
  win: new Audio('assets/win.mp3'),
  lose: new Audio('assets/lose.mp3')
};
```

## Método 2: Usar API de Web Audio (Sons sintéticos)

Já implementado! Os sons base64 são sons sintéticos temporários.

## Método 3: Usar sons online (CDN)

```javascript
const sounds = {
  move: new Audio('https://exemplo.com/move.mp3'),
  capture: new Audio('https://exemplo.com/capture.mp3'),
  // ...
};
```

## Controle de Volume

Para ajustar o volume, modifique a linha no código:
```javascript
sounds[soundName].volume = 0.3; // 0.0 a 1.0
```

## Desabilitar Sons

Adicione um botão no HTML para ligar/desligar sons:

```javascript
let soundEnabled = true;

function toggleSound() {
  soundEnabled = !soundEnabled;
}

function playSound(soundName) {
  if (!soundEnabled) return;
  // resto do código...
}
```

## Sites Recomendados para Sons:

1. **Freesound.org** (Grátis, Creative Commons)
2. **Mixkit.co** (Grátis, uso comercial OK)
3. **Zapsplat.com** (Grátis com registro)
4. **OpenGameArt.org** (Grátis, focado em jogos)

## Dica: Converter formatos

Use o **Audacity** (grátis) para:
- Converter WAV para MP3
- Ajustar volume
- Cortar/editar sons
- Reduzir tamanho do arquivo

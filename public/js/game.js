(() => {
  "use strict";

  // Referencias a los elementos de la página que se actualizan durante el juego.
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best-score");
  const timeEl = document.getElementById("time");
  const playerLabel = document.getElementById("player-label");
  const overlay = document.getElementById("game-overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayButton = document.getElementById("overlay-button");
  const saveStatus = document.getElementById("save-status");

  // Ajustes del tablero: 20 filas y 20 columnas de 28 píxeles cada una.
  const SIZE = 560;
  const CELLS = 20;
  const CELL = SIZE / CELLS;

  // Imágenes que se dibujan en el tablero.
  const appleImage = new Image();
  const snakeBodyImage = new Image();
  const snakeHeadImage = new Image();

  // La serpiente avanza una casilla cada 105 milisegundos.
  const STEP_MS = 105;

  // El récord personal se guarda en el navegador, independientemente del servidor.
  const BEST_KEY = "snake-best-score";

  // El nombre del jugador llega en la dirección URL, por ejemplo ?playerName=Ana.
  const params = new URLSearchParams(window.location.search);
  const rawName = (params.get("playerName") || "").trim();
  const nickname = (rawName || "Jugador").slice(0, 12);
  playerLabel.textContent = nickname;

  // Cuando cada imagen termina de cargarse, se vuelve a dibujar el tablero.
  [appleImage, snakeBodyImage, snakeHeadImage].forEach((image) => {
    image.addEventListener("load", draw, { once: true });
  });
  appleImage.src = "../assets/apple.svg";
  snakeBodyImage.src = "../assets/snake-body.svg";
  snakeHeadImage.src = "../assets/snake-head.svg";

  // Estado actual de la partida: posiciones, dirección, puntuación y tiempos.
  let snake, food, direction, nextDirection, score;
  let elapsedSeconds = 0;
  let lastStep = 0;

  // Estos valores controlan si la partida se está ejecutando o ya terminó.
  let animationId = null;
  let timerInterval = null;
  let running = false;
  let ended = false;

  // Lee el récord guardado en este navegador. Puede no estar disponible
  // si el navegador bloquea el almacenamiento local.
  function getBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch (_) {
      return 0;
    }
  }

  // Guarda el nuevo récord local; la clasificación global se guarda en el servidor.
  function setBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (_) {}
  }

  // Devuelve una coordenada aleatoria válida dentro del tablero.
  function randomCell() {
    return Math.floor(Math.random() * CELLS);
  }

  // Reúne las casillas que no ocupa la serpiente y elige una al azar.
  // Así no hace falta repetir intentos para encontrar una casilla libre.
  function placeFood() {
    const emptyCells = [];

    for (let y = 0; y < CELLS; y++) {
      for (let x = 0; x < CELLS; x++) {
        const occupied = snake.some((part) => part.x === x && part.y === y);
        if (!occupied) emptyCells.push({ x, y });
      }
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
  }

  // Prepara una partida nueva y reinicia todos los valores visibles y de juego.
  function resetState() {
    const center = Math.floor(CELLS / 2);
    snake = [
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center },
      { x: center - 3, y: center },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    elapsedSeconds = 0;
    lastStep = 0;
    running = false;
    ended = false;
    clearInterval(timerInterval);
    timerInterval = null;
    scoreEl.textContent = "0";
    timeEl.textContent = "00:00";
    bestEl.textContent = getBest();
    saveStatus.textContent = "";
    saveStatus.className = "save-status";
    food = placeFood();
    draw();
  }

  // Pinta el fondo cuadriculado, la comida y cada segmento de la serpiente.
  function draw() {
    ctx.fillStyle = "#f7faf2";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Alterna el color de las casillas para formar un patrón de tablero.
    for (let y = 0; y < CELLS; y++) {
      for (let x = 0; x < CELLS; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = "#edf3e7";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    // La comida y el cuerpo solo se dibujan si sus imágenes ya se cargaron.
    if (appleImage.complete && appleImage.naturalWidth) {
      ctx.drawImage(appleImage, food.x * CELL, food.y * CELL, CELL, CELL);
    }

    snake.slice(1).forEach((part) => {
      if (snakeBodyImage.complete && snakeBodyImage.naturalWidth) {
        ctx.drawImage(snakeBodyImage, part.x * CELL, part.y * CELL, CELL, CELL);
      }
    });

    // La cabeza se gira para que mire en la dirección en la que avanza.
    const head = snake[0];
    if (snakeHeadImage.complete && snakeHeadImage.naturalWidth) {
      const angle = Math.atan2(direction.y, direction.x) - Math.PI / 2;
      ctx.save();
      ctx.translate((head.x + 0.5) * CELL, (head.y + 0.5) * CELL);
      ctx.rotate(angle);
      ctx.drawImage(snakeHeadImage, -CELL / 2, -CELL / 2, CELL, CELL);
      ctx.restore();
    }
  }

  // Muestra el mensaje de inicio o de fin sobre el tablero.
  function showOverlay(kicker, title, buttonText) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayButton.textContent = buttonText;
    overlay.classList.remove("is-hidden");
  }

  // Oculta el mensaje para dejar visible la partida.
  function hideOverlay() {
    overlay.classList.add("is-hidden");
  }

  // Inicia el bucle del juego. Si la partida anterior terminó, primero la reinicia.
  function startGame() {
    if (ended) resetState();
    if (running) return;
    running = true;
    lastStep = performance.now();
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
      const seconds = String(elapsedSeconds % 60).padStart(2, "0");
      timeEl.textContent = `${minutes}:${seconds}`;
    }, 1000);
    hideOverlay();
    animationId = requestAnimationFrame(loop);
  }

  // Avanza la serpiente una casilla y comprueba comida, paredes y choques.
  function step() {
    direction = nextDirection;
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };
    const hitWall =
      head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS;
    const ate = head.x === food.x && head.y === food.y;
    const bodyToCheck = ate ? snake : snake.slice(0, -1);
    const hitSelf = bodyToCheck.some(
      (part) => part.x === head.x && part.y === head.y,
    );

    // Un choque con el borde o con el cuerpo termina la partida.
    if (hitWall || hitSelf) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (ate) {
      score += 10;
      scoreEl.textContent = String(score);

      // Actualiza el récord local si la puntuación actual lo supera.
      if (score > getBest()) {
        setBest(score);
        bestEl.textContent = String(score);
      }

      // Comprueba la victoria antes de buscar otra comida: el tablero está lleno.
      if (snake.length === CELLS * CELLS) {
        endGame(true);
        return;
      }

      food = placeFood();
    } else {
      // Si no comió, se mueve la cabeza y se quita la última parte de la cola.
      snake.pop();
    }
    draw();
  }

  // Bucle de animación: avanza y dibuja el juego a intervalos regulares.
  function loop(now) {
    if (!running || ended) return;
    if (now - lastStep >= STEP_MS) {
      step();
      lastStep = now;
    }
    if (running && !ended) animationId = requestAnimationFrame(loop);
  }

  // Envía la puntuación final a la API para que aparezca en la clasificación global.
  async function saveScore(durationSeconds) {
    if (score <= 0) return;
    saveStatus.textContent = "Guardando puntuación…";
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: nickname.slice(0, 12),
          score,
          durationSeconds,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      saveStatus.textContent = "✓ Puntuación guardada en la clasificación.";
      saveStatus.className = "save-status is-success";
    } catch (_) {
      saveStatus.textContent =
        "No se pudo guardar en el servidor; el récord local se conserva.";
      saveStatus.className = "save-status";
    }
  }

  // Detiene el juego, muestra el resultado y solicita guardar la puntuación.
  function endGame(won = false) {
    running = false;
    ended = true;
    if (animationId) cancelAnimationFrame(animationId);
    clearInterval(timerInterval);
    timerInterval = null;
    showOverlay(
      won ? "¡INCREÍBLE!" : "FIN DE LA PARTIDA",
      won ? "¡Has ganado!" : "Game Over",
      "Volver a jugar",
    );
    saveScore(elapsedSeconds);
  }

  // Cambia la dirección, pero impide que la serpiente dé media vuelta sobre sí misma.
  function changeDirection(x, y) {
    if (x === -direction.x && y === -direction.y) return;
    nextDirection = { x, y };
    if (!running && !ended) startGame();
  }

  // Lee las teclas de flecha o WASD para dirigir la serpiente.
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const handled = [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "w",
      "a",
      "s",
      "d",
    ];
    if (!handled.includes(key)) return;
    event.preventDefault();
    if (key === "arrowup" || key === "w") changeDirection(0, -1);
    else if (key === "arrowdown" || key === "s") changeDirection(0, 1);
    else if (key === "arrowleft" || key === "a") changeDirection(-1, 0);
    else if (key === "arrowright" || key === "d") changeDirection(1, 0);
  });

  // El botón de la pantalla inicial o final permite empezar otra partida.
  overlayButton.addEventListener("click", startGame);

  // Crea el estado inicial y muestra el mensaje de bienvenida.
  resetState();
  showOverlay("PREPARADO", "¿Listo para jugar?", "Empezar partida");
})();

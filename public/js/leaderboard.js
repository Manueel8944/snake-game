(() => {
  "use strict";

  // Elementos HTML donde se muestran las filas, los mensajes y el botón de recarga.
  const rows = document.getElementById("score-rows");
  const status = document.getElementById("leaderboard-status");
  const refreshButton = document.getElementById("refresh-scores");

  // Convierte los segundos en minutos:segundos, por ejemplo 125 en 2:05.
  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  // Presenta la fecha y la hora según el formato habitual en español.
  function formatDate(value) {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  // Pide las puntuaciones al servidor y construye la tabla en la página.
  async function loadScores() {
    // Evita recargas repetidas mientras la petición está en curso.
    refreshButton.disabled = true;
    status.textContent = "Cargando puntuaciones…";
    rows.replaceChildren();

    try {
      // La API devuelve las puntuaciones ordenadas para la clasificación.
      const response = await fetch("/api/scores");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const scores = await response.json();

      // Si no hay datos, muestra un mensaje en vez de dejar la tabla vacía.
      if (scores.length === 0) {
        status.textContent =
          "Todavía no hay puntuaciones. ¡Sé el primero en jugar!";
        return;
      }

      // Crea una fila y una celda por cada dato mostrado en la clasificación.
      scores.forEach((score, index) => {
        const row = document.createElement("tr");
        [
          String(index + 1),
          score.playerName,
          String(score.score),
          formatDuration(score.durationSeconds),
          formatDate(score.createdAt),
        ].forEach((value, cellIndex) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          // Resalta visualmente la puntuación (tercera columna).
          if (cellIndex === 2) cell.className = "leaderboard-score";
          row.append(cell);
        });
        rows.append(row);
      });
      status.textContent = `Mejores ${scores.length} puntuaciones`;
    } catch (_) {
      // Informa si la API no está disponible o devuelve una respuesta incorrecta.
      status.textContent =
        "No se pudo cargar la clasificación. Comprueba la conexión con el servidor.";
    } finally {
      // Se habilita el botón tanto si la carga tuvo éxito como si falló.
      refreshButton.disabled = false;
    }
  }

  // Permite actualizar manualmente y carga la clasificación al abrir la página.
  refreshButton.addEventListener("click", loadScores);
  loadScores();
})();

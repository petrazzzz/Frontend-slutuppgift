// API-konfiguration
const API_KEY = "49bdad73";
const API_URL = "https://www.omdbapi.com/";

// Hämtar referenser till HTML-element som används i koden
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const messageEl = document.getElementById("message");
const resultsContainer = document.getElementById("results");
const resultsTitleEl = document.querySelector(".results-title");
const resultsSubtitleEl = document.querySelector(".results-subtitle");
const modalOverlay = document.getElementById("modal-overlay");
const modalContent = document.getElementById("modal-content");
const modalCloseBtn = document.getElementById("modal-close");

// IMDb-ID:n för populära filmer
const POPULAR_MOVIES = [
  "tt0468569",
  "tt0133093",
  "tt0111161",
  "tt0109830",
  "tt0088763",
  "tt0382932",
  "tt0081505",
  "tt0078748",
  "tt0114369",
  "tt1375666",
  "tt0816692",
  "tt0090605",
  "tt0338013",
  "tt0112573",
  "tt0114709",
  "tt1049413",
  "tt0167260",
  "tt0080684",
  "tt0068646",
  "tt0110912",
  "tt0120737",
  "tt0120689"
];

// Sparar alla filmdata för filtrering
let allMovies = [];

// Laddar populära filmer när sidan startar
window.addEventListener("DOMContentLoaded", loadPopularMovies);

// Lyssnar på ändringar i genre-filtret
window.addEventListener("DOMContentLoaded", () => {
  const genreDropdown = document.getElementById("genre-filter");

  genreDropdown.addEventListener("change", (e) => {
    const selectedGenre = e.target.value;
    filterMoviesByGenre(selectedGenre);
  });
});

// Hanterar sökformuläret
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();

  if (!query) return showMessage("Skriv in en titel.");

  showMessage(`Söker efter filmer med "${query}"...`);
  resultsContainer.innerHTML = "";
  await fetchMovies(query);
});

// Visar meddelande till användaren
function showMessage(text) {
  messageEl.textContent = text;
}

// Formaterar speltid från minuter till "X h Y min"
function formatRuntime(runtime) {
  if (!runtime || runtime === "N/A") return "";

  const minutes = parseInt(runtime);
  if (isNaN(minutes)) return runtime;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
}

// Hämtar och visar populära filmer vid sidladdning
async function loadPopularMovies() {
  showMessage("Laddar populära filmer...");

  try {
    // Hämtar data för alla filmer parallellt
    const movies = await Promise.all(
      POPULAR_MOVIES.map(id =>
        fetch(`${API_URL}?apikey=${API_KEY}&i=${id}`)
          .then(r => r.json())
      )
    );

    const validMovies = movies.filter(m => m.Response !== "False");

    if (validMovies.length > 0) {
      showMessage("");
      allMovies = validMovies;
      renderMovies(validMovies);
    } else {
      showMessage("Kunde inte ladda populära filmer.");
    }
  } catch (error) {
    console.error(error);
    showMessage("Ett fel uppstod.");
  }
}

// Söker efter filmer baserat på användarens input
async function fetchMovies(query) {
  try {
    const response = await fetch(`${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}`);
    if (!response.ok) return showMessage("Kunde inte nå servern.");

    const data = await response.json();

    if (data.Response === "False") {
      showMessage(`Inga filmer hittades för "${query}".`);
      resultsTitleEl.innerHTML = `Sökresultat för <span class="highlight">"${query}"</span>`;
      resultsSubtitleEl.textContent = "Försök med ett annat sökord.";
      resultsContainer.innerHTML = "";
      return;
    }

    showMessage(`Hittade ${data.Search.length} filmer för "${query}".`);
    resultsTitleEl.innerHTML = `Sökresultat för <span class="highlight">"${query}"</span>`;
    resultsSubtitleEl.textContent = "De mest omtalade filmerna som matchar din sökning.";

    // Hämtar detaljerad information för varje sökresultat
    const detailedMovies = await Promise.all(
      data.Search.map(movie =>
        fetch(`${API_URL}?apikey=${API_KEY}&i=${movie.imdbID}`)
          .then(r => r.json())
      )
    );

    allMovies = detailedMovies;

    // Återställer genre-filtret till "Alla genrer"
    const genreDropdown = document.getElementById("genre-filter");
    if (genreDropdown) {
      genreDropdown.value = "all";
    }

    renderMovies(detailedMovies);

  } catch (error) {
    console.error(error);
    showMessage("Ett fel uppstod.");
  }
}

// Skapar och visar filmkort för varje film
function renderMovies(movies) {
  resultsContainer.innerHTML = "";

  movies.forEach(movie => {
    const card = document.createElement("article");
    card.className = "movie-card";

    const poster = movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x450?text=Ingen+bild";
    const rating = movie.imdbRating !== "N/A" && movie.imdbRating ? movie.imdbRating : "-";
    const genre = movie.Genre ? movie.Genre.split(',')[0].trim() : "";
    const runtime = formatRuntime(movie.Runtime);

    card.innerHTML = `
      <div class="movie-card-image-wrapper">
        <img src="${poster}" alt="${movie.Title}">
        <div class="movie-badge">${rating}</div>
      </div>
      <div class="movie-card-content">
        <div class="movie-title">${movie.Title}</div>
        <div class="movie-year-type">
          <span>${movie.Year || ""}</span>
          <span>•</span>
          <span>⏱ ${runtime}</span>
          <span>•</span>
          <span>${genre}</span>
        </div>
      </div>
    `;

    card.addEventListener("click", () => fetchMovieDetails(movie.imdbID));
    resultsContainer.appendChild(card);
  });
}

// Filtrerar filmer baserat på vald genre
function filterMoviesByGenre(genre) {
  if (genre === "all") {
    renderMovies(allMovies);
    return;
  }

  const filteredMovies = allMovies.filter(movie => {
    return movie.Genre && movie.Genre.includes(genre);
  });

  if (filteredMovies.length === 0) {
    resultsContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">Inga filmer hittades för denna genre.</p>';
    return;
  }

  renderMovies(filteredMovies);
}

// Hämtar och visar detaljerad information om en film i modal
async function fetchMovieDetails(id) {
  try {
    const response = await fetch(`${API_URL}?apikey=${API_KEY}&i=${id}&plot=full`);
    if (!response.ok) return openModal("<p>Kunde inte hämta detaljer.</p>");

    const movie = await response.json();
    if (movie.Response === "False") return openModal("<p>Kunde inte hämta detaljer.</p>");

    const poster = movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x450?text=Ingen+bild";

    openModal(`
      <div class="modal-body">
        <img src="${poster}" alt="${movie.Title}">
        <div>
          <h3>${movie.Title}</h3>
          <div class="movie-meta">
            <strong>År:</strong> ${movie.Year || "-"}<br>
            <strong>Genre:</strong> ${movie.Genre || "-"}<br>
            <strong>Längd:</strong> ${movie.Runtime || "-"}<br>
            <strong>IMDb:</strong> ${movie.imdbRating && movie.imdbRating !== "N/A" ? movie.imdbRating : "-"}<br>
            <strong>Regissör:</strong> ${movie.Director || "-"}<br>
            <strong>Skådespelare:</strong> ${movie.Actors || "-"}
          </div>
          <p class="movie-plot">${movie.Plot || "Ingen beskrivning tillgänglig."}</p>
        </div>
      </div>
    `);

  } catch (error) {
    console.error(error);
    openModal("<p>Ett fel uppstod.</p>");
  }
}

// Öppnar modal och visar innehåll
function openModal(html) {
  modalContent.innerHTML = html;
  modalOverlay.classList.add("is-visible");
  document.body.style.overflow = "hidden";
}

// Stänger modal
function closeModal() {
  modalOverlay.classList.remove("is-visible");
  document.body.style.overflow = "";
}

// Event listeners för att stänga modal
modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => e.target === modalOverlay && closeModal());
document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());

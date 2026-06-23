import { useEffect, useState } from "react";

const API_URL = "https://swapi.info/api/films";

async function fetchCharacterNames(characterUrls) {
  const characters = await Promise.all(
    characterUrls.map(async (url) => {
      const response = await fetch(url);
      const result = await response.json();
      return result.name;
    })
  );
  return characters;
}

export default function StarWarsFilmsSolution() {
  const [moviesList, setMoviesList] = useState([]);
  const [charactersByMovie, setCharactersByMovie] = useState({});
  const [loadingIndex, setLoadingIndex] = useState(null);

  useEffect(() => {
    const fetchFilms = async () => {
      const response = await fetch(API_URL);
      const result = await response.json();
      setMoviesList(result);
    };

    fetchFilms();
  }, []);

  async function handleShowCharacters(index) {
    const movie = moviesList[index];
    if (!movie) return;

    setLoadingIndex(index);
    try {
      const names = await fetchCharacterNames(movie.characters);
      setCharactersByMovie((prev) => ({ ...prev, [index]: names }));
    } finally {
      setLoadingIndex(null);
    }
  }

  return (
    <div className="app">
      <div id="intro">
        <h1>StarWars films</h1>
        <p>A long time ago, in a galaxy far, far away...</p>
      </div>

      <div id="list">
        <h2>Movie List:</h2>
        <ul>
          {moviesList.map((movie, index) => (
            <li key={movie.episode_id ?? index}>
              {movie.title}
              <button
                type="button"
                onClick={() => handleShowCharacters(index)}
                disabled={loadingIndex === index}
              >
                {loadingIndex === index ? "Loading..." : "Show Characters"}
              </button>

              {charactersByMovie[index]?.length > 0 && (
                <ul>
                  {charactersByMovie[index].map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

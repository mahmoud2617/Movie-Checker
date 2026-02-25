package com.mahmoud.movieChecker.service;

import com.mahmoud.movieChecker.dto.RetrievedDataFromOmdbApi;
import com.mahmoud.movieChecker.entity.MovieDetails;
import com.mahmoud.movieChecker.exception.MovieNotFoundException;
import com.mahmoud.movieChecker.repository.MovieDetailsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MovieDetailsService {
    @Value("${OMDB_API_KEY}")
    private String apiKey;

    private final MovieDetailsRepository movieDetailsRepository;
    private final RestClient restClient;

    public Set<MovieDetails> getAllMovies() {
        return movieDetailsRepository.findAllMovieDetails();
    }

    public List<MovieDetails> search(String q) {
        if (q == null || q.isBlank()) {
            return new ArrayList<>();
        }

        List<MovieDetails> localMovies = movieDetailsRepository.search(q.trim());

        if (localMovies.size() >= 10) {
            return localMovies;
        }

        List<String> titles = getMoviesTitlesFromOmdb(q);
        List<String> localMoviesTitles = movieDetailsRepository.findAllMoviesTitles();
        List<MovieDetails> externalMovies = new ArrayList<>();

        int i = 5;
        
        for (String title : titles) {
            try {
                if (!localMoviesTitles.contains(title)) {
                    externalMovies.add(getMovieDetailsFromOmdb(title));
                }

                i--;
            } catch (Exception ignored) {
            }

            if (i == 0) {
                break;
            }
        }

        return Stream.concat(localMovies.stream(), externalMovies.stream()).toList();
    }

    public List<String> suggest(String q) {
        if (q == null || q.isBlank()) {
            return new ArrayList<>();
        }

        List<String> localMoviesTitles = movieDetailsRepository.suggest(q.trim());

        if (localMoviesTitles.size() >= 5) {
            return localMoviesTitles;
        }

        List<String> titles = getMoviesTitlesFromOmdb(q);

        for (String title : titles) {
            try {
                if (!localMoviesTitles.contains(title)) {
                    getMovieDetailsFromOmdb(title);
                }
            } catch (Exception ignored) {
            }
        }

        return Stream.concat(localMoviesTitles.stream(), titles.stream()).distinct().toList();
    }

    public MovieDetails getMovieDetails(String movieTitle) {
        return movieDetailsRepository.findByTitleIgnoreCase(movieTitle.trim())
                .orElseGet(() -> getMovieDetailsFromOmdb(movieTitle));
    }

    private MovieDetails getMovieDetailsFromOmdb(String movieTitle) {
        RetrievedDataFromOmdbApi movieData = (RetrievedDataFromOmdbApi) retrieveMovieDetailsFromOmdbApi(
            "t", movieTitle.trim()
        );

        if (movieData.imdbID() == null) {
            throw new MovieNotFoundException();
        }

        Integer year = null;
        Double imdbRate = null;

        if (movieData.Year() != null && movieData.Year().length() >= 4) {
            year = Integer.parseInt(movieData.Year().substring(0, 4));
        }

        try {
            imdbRate = Double.valueOf(movieData.imdbRating());
        } catch (Exception ignored) {
        }

        MovieDetails localMovie = movieDetailsRepository.findByImdbId(movieData.imdbID()).orElse(null);

        if (localMovie != null) {
            return localMovie;
        }

        MovieDetails movie = MovieDetails.builder()
                .imdbId(movieData.imdbID())
                .title(movieData.Title())
                .year(year)
                .runtime(movieData.Runtime())
                .genre(movieData.Genre())
                .overview(movieData.Plot())
                .posterUrl(movieData.Poster())
                .imdbRate(imdbRate)
                .type(movieData.Type())
                .build();

        movieDetailsRepository.save(movie);

        return movie;
    }

    private List<String> getMoviesTitlesFromOmdb(String q) {
        ObjectMapper mapper = new ObjectMapper();

        String json = (String) retrieveMovieDetailsFromOmdbApi("s", q);
        JsonNode root = mapper.readTree(json);

        JsonNode searchProperty = root.path("Search");
        List<String> titles = new ArrayList<>();

        if (searchProperty.isArray()) {
            for (int i = 0; i < searchProperty.size(); i++) {
                JsonNode titleNode = searchProperty.get(i).path("Title");

                if (!titleNode.isMissingNode()) {
                    titles.add(titleNode.asString());
                }
            }
        }

        return titles;
    }

    private Object retrieveMovieDetailsFromOmdbApi(String param, String q) {
        Class<?> body = RetrievedDataFromOmdbApi.class;

        body = (param.equals("s"))? String.class : body;

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .queryParam("apiKey", apiKey)
                    .queryParam(param, q)
                    .build()
                )
                .retrieve()
                .body(body);
    }
}

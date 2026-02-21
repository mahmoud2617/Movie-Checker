package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.dto.RetrievedDataFromOmdbApi;
import com.mahmou.movieChecker.entity.MovieDetails;
import com.mahmou.movieChecker.exception.MovieNotFoundException;
import com.mahmou.movieChecker.repository.MovieDetailsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MovieDetailsService {
    @Value("${OMDB_API_KEY}")
    private String apiKey;

    private final MovieDetailsRepository movieDetailsRepository;
    private final RestClient restClient;

    public List<MovieDetails> getAllMovies() {
        return movieDetailsRepository.findAll();
    }

    public List<MovieDetails> search(String q) {
        List<MovieDetails> localMovies =  movieDetailsRepository.search(q);

        if (localMovies.size() >= 5) {
            return localMovies;
        }

        List<String> titles = getMoviesTitlesFromOmdb(q);
        List<String> localMoviesTitles = movieDetailsRepository.findAllMoviesTitles();
        List<MovieDetails> externalMovies = new ArrayList<>();

        for (int i = 0; i < titles.size() / 2; i++) {
            if (!localMoviesTitles.contains(titles.get(i))) {
                externalMovies.add(getMovieDetailsFromOmdb(titles.get(i)));
            }
        }

        return Stream.concat(localMovies.stream(), externalMovies.stream()).toList();
    }

    public List<String> suggest(String q) {
        List<String> localMoviesTitles = movieDetailsRepository.suggest(q);

        if (localMoviesTitles.size() >= 5) {
            return localMoviesTitles;
        }

        List<String> titles = getMoviesTitlesFromOmdb(q);

        for (int i = 0; i < titles.size() / 2; i++) {
            if (!localMoviesTitles.contains(titles.get(i))) {
                getMovieDetailsFromOmdb(titles.get(i));
            }
        }

        return Stream.concat(localMoviesTitles.stream(), titles.stream()).distinct().toList();
    }

    public MovieDetails getMovieDetails(String movieTitle) {
        return movieDetailsRepository.findByTitleIgnoreCase(movieTitle.trim())
                .orElseGet(() -> getMovieDetailsFromOmdb(movieTitle));
    }

    private MovieDetails getMovieDetailsFromOmdb(String movieTitle) {
        RetrievedDataFromOmdbApi movieData = (RetrievedDataFromOmdbApi) retrieveMovieDetailsFromOmdbApi("t", movieTitle.trim());

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

        try {
            movieDetailsRepository.save(movie);
        } catch (DataIntegrityViolationException e) {
            return movieDetailsRepository.findByImdbId(movieData.imdbID());
        }

        return movie;
    }

    private List<String> getMoviesTitlesFromOmdb(String q) {
        ObjectMapper mapper = new ObjectMapper();

        String json = (String) retrieveMovieDetailsFromOmdbApi("s", q);
        JsonNode root = mapper.readTree(json);

        JsonNode searchProperty = root.path("Search");

        List<String> titles = new ArrayList<>();

        for (int i = 0; i < searchProperty.size(); i++) {
            titles.add(searchProperty.get(i).path("Title").stringValue());
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

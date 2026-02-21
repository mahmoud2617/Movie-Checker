package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.dto.ChangeMovieFavoriteRequest;
import com.mahmou.movieChecker.dto.ChangeMovieStatusRequest;
import com.mahmou.movieChecker.dto.ChangeUserRateRequest;
import com.mahmou.movieChecker.entity.MovieDetails;
import com.mahmou.movieChecker.entity.MovieStatus;
import com.mahmou.movieChecker.entity.UserMovies;
import com.mahmou.movieChecker.exception.InvalidRequestDataException;
import com.mahmou.movieChecker.exception.UserDoesNotHaveTheMovieException;
import com.mahmou.movieChecker.repository.UserMoviesRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@AllArgsConstructor
public class UserMoviesService {
    private final UserMoviesRepository userMoviesRepository;
    private final MovieDetailsService movieDetailsService;
    private final AuthService authService;

    public List<UserMovies> getUserMovies(MovieStatus status, Boolean favorite) {
        if (status == null && favorite == null) {
            return userMoviesRepository.findAllByUser(authService.getCurrentUser());
        } else if (status == null) {
            return userMoviesRepository.findAllByFavoriteAndUser(favorite, authService.getCurrentUser());
        } else if (favorite == null) {
            return userMoviesRepository.findAllByStatusAndUser(status, authService.getCurrentUser());
        } else {
            return userMoviesRepository.findAllByStatusAndFavoriteAndUser(status, favorite, authService.getCurrentUser());
        }
    }

    public void updateMovieStatus(ChangeMovieStatusRequest request) {
        String movieTitle = request.getTitle().trim();
        MovieStatus movieStatus = request.getStatus();

        MovieDetails movieDetails = movieDetailsService.getMovieDetails(movieTitle);

        UserMovies userMovie = userMoviesRepository
                            .findByMovieDetailsAndUser(movieDetails, authService.getCurrentUser())
                            .orElse(null);

        if (movieStatus == null) {
            if (userMovie == null) {
                throw new UserDoesNotHaveTheMovieException("You already don't have this movie in any list.");
            }

            userMoviesRepository.delete(userMovie);
            return;
        }

        if (userMovie != null && movieStatus == userMovie.getStatus()) {
            throw new InvalidRequestDataException("Movie status already " + movieStatus);
        }

        if (userMovie == null) {
            userMovie = UserMovies.builder()
                    .isFavorite(false)
                    .addedAt(LocalDate.now())
                    .movieDetails(movieDetails)
                    .user(authService.getCurrentUser())
                    .build();
        }

        userMovie.setStatus(movieStatus);

        userMoviesRepository.save(userMovie);
    }

    public void updateMovieFavorite(ChangeMovieFavoriteRequest request) {
        String movieTitle = request.getTitle().trim();
        boolean isFavorite = request.isFavorite();

        MovieDetails movieDetails = movieDetailsService.getMovieDetails(movieTitle);

        UserMovies userMovie = userMoviesRepository
                            .findByMovieDetailsAndUser(movieDetails, authService.getCurrentUser())
                            .orElse(null);

        if (!isFavorite) {
            if (userMovie == null) {
                throw new UserDoesNotHaveTheMovieException("You already don't have this movie in favorites.");
            } else if (userMovie.getStatus() == null) {
                userMoviesRepository.delete(userMovie);
            } else {
                userMovie.setIsFavorite(false);
                userMoviesRepository.save(userMovie);
            }

            return;
        } else if (userMovie == null) {
            userMovie = UserMovies.builder()
                    .movieDetails(movieDetails)
                    .user(authService.getCurrentUser())
                    .build();
        }

        userMovie.setIsFavorite(true);

        userMoviesRepository.save(userMovie);
    }

    public void updateUserRate(ChangeUserRateRequest request) {
        UserMovies userMovie = userMoviesRepository
                    .findByMovieTitleIgnoreCaseAndUser(
                        request.getTitle().trim(),
                        authService.getCurrentUser(),
                        PageRequest.of(0, 1))
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new UserDoesNotHaveTheMovieException("You don't have this movie in any list."));

        if (userMovie.getStatus() == null) {
            throw new UserDoesNotHaveTheMovieException("Cannot rate movie that doesn't belong to any list");
        }

        if (request.getRate() < 0.0 || request.getRate() > 10.0) {
            throw new InvalidRequestDataException("Rate must be at most 10.0 and cannot be negative.");
        }

        userMovie.setUserRate(request.getRate());
        userMoviesRepository.save(userMovie);
    }
}

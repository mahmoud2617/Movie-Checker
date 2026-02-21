package com.mahmou.movieChecker.controller;

import com.mahmou.movieChecker.dto.ChangeMovieFavoriteRequest;
import com.mahmou.movieChecker.dto.ChangeMovieStatusRequest;
import com.mahmou.movieChecker.dto.ChangeUserRateRequest;
import com.mahmou.movieChecker.entity.MovieStatus;
import com.mahmou.movieChecker.entity.UserMovies;
import com.mahmou.movieChecker.service.UserMoviesService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user-movies")
@PreAuthorize("isAuthenticated()")
@AllArgsConstructor
public class UserMoviesController {
    private final UserMoviesService userMoviesService;

    @GetMapping
    public ResponseEntity<List<UserMovies>> getUserMovies(
        @RequestParam(required = false) MovieStatus status,
        @RequestParam(required = false) Boolean favorite
    ) {
        return ResponseEntity.ok(userMoviesService.getUserMovies(status, favorite));
    }

    @PatchMapping("/status")
    public ResponseEntity<Void> updateMovieStatus(
        @Valid @RequestBody ChangeMovieStatusRequest changeMovieStatusRequest
    ) {
        userMoviesService.updateMovieStatus(changeMovieStatusRequest);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/favorite")
    public ResponseEntity<Void> updateMovieFavorite(
        @Valid @RequestBody ChangeMovieFavoriteRequest changeMovieFavoriteRequest
    ) {
        userMoviesService.updateMovieFavorite(changeMovieFavoriteRequest);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/user-rate")
    public ResponseEntity<Void> updateUserRate(
        @Valid @RequestBody ChangeUserRateRequest changeUserRateRequest
    ) {
        userMoviesService.updateUserRate(changeUserRateRequest);
        return ResponseEntity.ok().build();
    }
}

package com.mahmoud.movieChecker.controller;

import com.mahmoud.movieChecker.entity.MovieDetails;
import com.mahmoud.movieChecker.service.MovieDetailsService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/movies")
@AllArgsConstructor
public class MovieDetailsController {
    private final MovieDetailsService movieDetailsService;

    @GetMapping
    public List<MovieDetails> getAllMovies() {
        return movieDetailsService.getAllMovies();
    }

    @GetMapping("/search")
    public List<MovieDetails> search(
        @RequestParam String q
    ) {
        return movieDetailsService.search(q);
    }

    @GetMapping("/search/suggest")
    public List<String> suggest(
        @RequestParam String q
    ) {
        return movieDetailsService.suggest(q);
    }
}

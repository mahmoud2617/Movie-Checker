package com.mahmou.movieChecker.dto;

import com.mahmou.movieChecker.entity.MovieStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChangeMovieStatusRequest {
    @NotNull(message = "Movie title cannot be null.")
    @NotBlank(message = "Movie title is required.")
    private String title;

    private MovieStatus status;
}

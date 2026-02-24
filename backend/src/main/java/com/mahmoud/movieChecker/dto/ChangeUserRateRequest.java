package com.mahmoud.movieChecker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChangeUserRateRequest {
    @NotNull(message = "Movie title cannot be null.")
    @NotBlank(message = "Movie title is required.")
    private String title;

    @NotNull(message = "Rate cannot be null.")
    private Double rate;
}

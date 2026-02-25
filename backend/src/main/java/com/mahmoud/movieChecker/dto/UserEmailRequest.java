package com.mahmoud.movieChecker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserEmailRequest {
    @NotNull(message = "Email cannot be null.")
    @NotBlank(message = "Email is required.")
    private String email;
}

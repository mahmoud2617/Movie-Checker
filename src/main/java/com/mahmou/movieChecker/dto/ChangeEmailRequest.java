package com.mahmou.movieChecker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChangeEmailRequest {
    @NotNull(message = "Email cannot be null.")
    @NotBlank(message = "Email is required.")
    @Email
    private String email;
}

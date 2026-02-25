package com.mahmoud.movieChecker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ResetPasswordRequest {
    @NotNull(message = "Password cannot be null.")
    @NotBlank(message = "Password is required.")
    @Size(min = 8, max = 100, message = "New password must be between 8 and 100 characters.")
    private String newPassword;
}

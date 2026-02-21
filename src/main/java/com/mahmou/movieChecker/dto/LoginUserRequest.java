package com.mahmou.movieChecker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginUserRequest {
    @NotNull(message = "Email cannot be null.")
    @NotBlank(message = "Email is required.")
    @Email
    private String email;

    @NotNull(message = "Password cannot be null.")
    @NotBlank(message = "Password is required.")
    @Size(min = 8, max = 100, message = "Password must be from 8 to 100 character.")
    private String password;
}

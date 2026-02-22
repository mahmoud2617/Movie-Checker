package com.mahmoud.movieChecker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChangeNameRequest {
    @NotNull(message = "Name cannot be null.")
    @NotBlank(message = "Name is required.")
    @Size(max = 100, message = "Name must be less than 100 character.")
    private String name;
}

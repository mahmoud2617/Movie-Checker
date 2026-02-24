package com.mahmoud.movieChecker.dto;

import com.mahmoud.movieChecker.entity.Role;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChangeRoleRequest {
    @NotNull(message = "ID cannot be null.")
    @Min(value = 1, message = "ID must be at least 1.")
    @Max(value = Long.MAX_VALUE, message = "ID is too long.")
    private Long id;

    @NotNull(message = "Role cannot be null.")
    @NotBlank(message = "Role is required.")
    private Role role;
}

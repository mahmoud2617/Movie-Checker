package com.mahmoud.movieChecker.security.jwt;

import com.mahmoud.movieChecker.entity.Role;

public record Token(
    Long id,
    String email,
    Role role
) {}

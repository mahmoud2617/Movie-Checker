package com.mahmoud.movieChecker.security.jwt;

import com.mahmoud.movieChecker.entity.Role;
import com.mahmoud.movieChecker.entity.TokenType;

public record Token(
    Long id,
    String email,
    Role role,
    TokenType tokenType
) {}

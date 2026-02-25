package com.mahmoud.movieChecker.security.jwt;

import com.mahmoud.movieChecker.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
@AllArgsConstructor
public class JwtService {
    private final JwtConfig jwtConfig;

    public Jwt generateAccessToken(Token userToken) {
        return generateToken(userToken, jwtConfig.getAccessTokenExpiration());
    }

    public Jwt generateRefreshToken(Token userToken) {
        return generateToken(userToken, jwtConfig.getRefreshTokenExpiration());
    }

    public Jwt generateResetToken(Token userToken) {
        return generateToken(userToken, jwtConfig.getResetTokenExpiration());
    }

    private Jwt generateToken(Token userToken, long tokenExpiration) {
        Claims claims = Jwts.claims()
                .subject(userToken.id().toString())
                .add("email", userToken.email())
                .add("role", userToken.role().name())
                .add("tokenType", userToken.tokenType().name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 1000 * tokenExpiration))
                .build();

        return new Jwt(claims, jwtConfig.getSecretKey());
    }

    public Jwt parseToken(String token) {
        try {
            Claims claims = getClaims(token);
            return new Jwt(claims, jwtConfig.getSecretKey());
        } catch (JwtException e) {
            return null;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(jwtConfig.getSecretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

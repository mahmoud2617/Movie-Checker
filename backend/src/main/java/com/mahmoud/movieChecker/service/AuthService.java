package com.mahmoud.movieChecker.service;

import com.mahmoud.movieChecker.config.JwtConfig;
import com.mahmoud.movieChecker.dto.JwtResponse;
import com.mahmoud.movieChecker.dto.LoginUserRequest;
import com.mahmoud.movieChecker.entity.VerificationToken;
import com.mahmoud.movieChecker.exception.InvalidVerificationEmailTokenException;
import com.mahmoud.movieChecker.repository.VerificationTokenRepository;
import com.mahmoud.movieChecker.security.jwt.Token;
import com.mahmoud.movieChecker.dto.UserDto;
import com.mahmoud.movieChecker.entity.User;
import com.mahmoud.movieChecker.exception.UnauthorizedUserException;
import com.mahmoud.movieChecker.exception.UserNotFoundException;
import com.mahmoud.movieChecker.mapper.UserMapper;
import com.mahmoud.movieChecker.repository.UserRepository;
import com.mahmoud.movieChecker.security.CustomUserDetails;
import com.mahmoud.movieChecker.security.jwt.Jwt;
import com.mahmoud.movieChecker.security.jwt.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final VerificationTokenService verificationTokenService;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;
    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final UserMapper userMapper;

    public User getCurrentUser() {
        var principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (!(principal instanceof CustomUserDetails customUserDetails)) {
            throw new UnauthorizedUserException();
        }

        return userRepository.findById(customUserDetails.getId()).orElseThrow(UserNotFoundException::new);
    }

    public JwtResponse login(LoginUserRequest loginRequest, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getEmail(),
                loginRequest.getPassword()
            )
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        if (!userDetails.getEnabled()) {
            User user = userRepository.findById(userDetails.getId()).orElseThrow();
            verificationTokenService.sendVerificationEmailToken(user);

            throw new UnauthorizedUserException("Please verify your email first.");
        }

        Token token = new Token(
                userDetails.getId(),
                userDetails.getEmail(),
                userDetails.getRole()
        );

        Jwt accessToken = jwtService.generateAccessToken(token);
        Jwt refreshToken = jwtService.generateRefreshToken(token);

        Cookie cookie = new Cookie("refreshToken", refreshToken.toString());
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/auth/refresh");
        cookie.setMaxAge(jwtConfig.getRefreshTokenExpiration());
        response.addCookie(cookie);

        return new JwtResponse(accessToken.toString());
    }

    public void logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    @Transactional
    public void verifyEmail(String token) {
        VerificationToken verificationToken =
                verificationTokenRepository.findByToken(token).orElseThrow(
                    InvalidVerificationEmailTokenException::new
                );

        if (verificationToken.getExpirationDate().isBefore(LocalDateTime.now())) {
            throw new InvalidVerificationEmailTokenException("Token is expired.");
        }

        User user = verificationToken.getUser();
        user.setEnabled(true);
        userRepository.save(user);

        verificationTokenRepository.deleteAllByUser(verificationToken.getUser());
    }

    @Transactional
    public JwtResponse refreshLogin(String refreshToken) {
        Jwt jwt = jwtService.parseToken(refreshToken);

        if (jwt == null || jwt.isExpired()) {
            throw new UnauthorizedUserException();
        }

        User user = userRepository.findById(jwt.getUserId()).orElseThrow(UnauthorizedUserException::new);

        Jwt accessToken = jwtService.generateAccessToken(
            new Token(user.getId(), user.getEmail(), user.getRole())
        );

        return new JwtResponse(accessToken.toString());
    }

    public UserDto me() {
        return userMapper.toDto(getCurrentUser());
    }
}

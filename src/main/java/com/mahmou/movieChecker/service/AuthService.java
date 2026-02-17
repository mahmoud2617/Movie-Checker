package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.config.JwtConfig;
import com.mahmou.movieChecker.dto.JwtResponse;
import com.mahmou.movieChecker.dto.LoginUserRequest;
import com.mahmou.movieChecker.dto.UserDto;
import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.mapper.UserMapper;
import com.mahmou.movieChecker.repository.UserRepository;
import com.mahmou.movieChecker.security.CustomUserDetails;
import com.mahmou.movieChecker.security.jwt.Jwt;
import com.mahmou.movieChecker.security.jwt.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public CustomUserDetails getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        return (CustomUserDetails) authentication.getPrincipal();
    }

    public JwtResponse login(LoginUserRequest loginRequest, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getEmail(),
                loginRequest.getPassword()
            )
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Jwt accessToken = jwtService.generateAccessToken(userDetails.getUser());
        Jwt refreshToken = jwtService.generateRefreshToken(userDetails.getUser());

        Cookie cookie = new Cookie("refreshToken", refreshToken.toString());
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/auth/refresh");
        cookie.setMaxAge(jwtConfig.getRefreshTokenExpiration());
        response.addCookie(cookie);

        return new JwtResponse(accessToken.toString());
    }

    public JwtResponse refreshLogin(String refreshToken) {
        Jwt jwt = jwtService.parseToken(refreshToken);

        if (jwt == null || jwt.isExpired()) {
            return null;
        }

        User user = userRepository.findById(jwt.getUserId()).orElseThrow();

        Jwt accessToken = jwtService.generateAccessToken(user);

        return new JwtResponse(accessToken.toString());
    }

    public UserDto me() {
        return userMapper.toDto(getCurrentUser().getUser());
    }
}

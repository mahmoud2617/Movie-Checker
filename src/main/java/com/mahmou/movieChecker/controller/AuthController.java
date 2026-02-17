package com.mahmou.movieChecker.controller;

import com.mahmou.movieChecker.dto.JwtResponse;
import com.mahmou.movieChecker.dto.LoginUserRequest;
import com.mahmou.movieChecker.dto.UserDto;
import com.mahmou.movieChecker.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@AllArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(
        @Valid @RequestBody LoginUserRequest loginRequest,
        HttpServletResponse response
    ) {
        return ResponseEntity.ok(authService.login(loginRequest, response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refresh(
        @CookieValue(value = "refreshToken") String refreshToken
    ) {
        JwtResponse response = authService.refreshLogin(refreshToken);

        if (response == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me() {
        return ResponseEntity.ok(authService.me());
    }
}

package com.mahmou.movieChecker.controller;

import com.mahmou.movieChecker.dto.*;
import com.mahmou.movieChecker.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/users")
@AllArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<Void> registerUser(
        @Valid @RequestBody RegisterUserRequest request,
        UriComponentsBuilder uriBuilder
    ) {
        UserDto userDto =  userService.registerUser(request);

        var uri = uriBuilder.path("/users/{id}")
                .buildAndExpand(userDto.getId()).toUri();

        return ResponseEntity.created(uri).build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<UserDto> getAllUser() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable(name = "id") Long userId) {
        return ResponseEntity.ok(userService.getUserInfo(userId));
    }

    @PatchMapping("/change-name/{id}")
    public ResponseEntity<Void> updateUserName(
        @PathVariable(name = "id") Long userId,
        @Valid @RequestBody ChangeNameRequest changeNameRequest
    ) {
        userService.updateUserName(userId, changeNameRequest);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/change-email/{id}")
    public ResponseEntity<Void> updateUserEmail(
        @PathVariable(name = "id") Long userId,
        @Valid @RequestBody ChangeEmailRequest changeEmailRequest
    ) {
        userService.updateUserEmail(userId, changeEmailRequest);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/change-password/{id}")
    public ResponseEntity<Void> updateUserPassword(
        @PathVariable(name = "id") Long userId,
        @Valid @RequestBody ChangePasswordRequest changePasswordRequest
    ) {
        userService.updateUserPassword(userId, changePasswordRequest);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable(name = "id") Long userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
}

package com.mahmoud.movieChecker.controller;

import com.mahmoud.movieChecker.dto.*;
import com.mahmoud.movieChecker.security.CustomUserDetails;
import com.mahmoud.movieChecker.security.annotation.IsSelfOrAdmin;
import com.mahmoud.movieChecker.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/users")
@AllArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<Void> signUp(
        @Valid @RequestBody RegisterUserRequest request,
        UriComponentsBuilder uriBuilder
    ) {
        UserDto userDto = userService.registerUser(request);

        var uri = uriBuilder.path("/users/{id}")
                .buildAndExpand(userDto.getId()).toUri();

        return ResponseEntity.created(uri).build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<UserDto> getAllUser() {
        return userService.getAllUsers();
    }

    @IsSelfOrAdmin
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable("id") Long userId) {
        return ResponseEntity.ok(userService.getUserInfo(userId));
    }

    @PreAuthorize("isAuthenticated()")
    @PatchMapping("/change-name")
    public ResponseEntity<Void> updateUserName(
        @AuthenticationPrincipal CustomUserDetails user,
        @Valid @RequestBody ChangeNameRequest changeNameRequest
    ) {
        userService.updateUserName(user.getId(), changeNameRequest);
        return ResponseEntity.noContent().build();
    }

    @IsSelfOrAdmin
    @PatchMapping("/change-password/{id}")
    public ResponseEntity<Void> updateUserPassword(
        @PathVariable("id") Long userId,
        @Valid @RequestBody ChangePasswordRequest changePasswordRequest
    ) {
        userService.updateUserPassword(userId, changePasswordRequest);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("isAuthenticated()")
    @DeleteMapping
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal CustomUserDetails user) {
        userService.deleteUser(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/reset-password/request")
    public ResponseEntity<UserIdResponse> verifyEmailToChangePassword(
        @Valid @RequestBody UserEmailRequest userEmailRequest
    ) {
        return ResponseEntity.ok(userService.requestToResetPassword(userEmailRequest));
    }

    @PatchMapping("/reset-password/verify")
    public ResponseEntity<JwtResponse> verifyCodeToChangePassword(
        @RequestParam(name = "id") Long id,
        @RequestParam(name = "code") Integer code
    ) {
        return ResponseEntity.ok(userService.verifyToResetPassword(id, code));
    }

    @PatchMapping("/password-reset/confirm")
    public ResponseEntity<Void> resetUserPassword(
        @AuthenticationPrincipal CustomUserDetails user,
        @Valid @RequestBody ResetPasswordRequest resetPasswordRequest
    ) {
        userService.resetPassword(user.getId(), resetPasswordRequest);
        return ResponseEntity.noContent().build();
    }
}

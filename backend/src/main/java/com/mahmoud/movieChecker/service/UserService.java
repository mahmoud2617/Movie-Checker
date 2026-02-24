package com.mahmoud.movieChecker.service;

import com.mahmoud.movieChecker.dto.*;
import com.mahmoud.movieChecker.entity.Role;
import com.mahmoud.movieChecker.entity.User;
import com.mahmoud.movieChecker.exception.UnmodifiedDataException;
import com.mahmoud.movieChecker.exception.UserBadCredentialsException;
import com.mahmoud.movieChecker.exception.InvalidRequestDataException;
import com.mahmoud.movieChecker.exception.UserNotFoundException;
import com.mahmoud.movieChecker.mapper.UserMapper;
import com.mahmoud.movieChecker.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class UserService {
    private final VerificationTokenService verificationTokenService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Transactional
    public UserDto registerUser(RegisterUserRequest request) {
        List<User> users = userRepository.findAll();

        String password = request.getPassword();

        users.stream()
                .filter(u ->
                        u.getEmail().equals(request.getEmail())
                )
                .findFirst()
                .ifPresent(u -> {
                    throw new UserBadCredentialsException("Cannot use this email.");
                });

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .role(Role.USER)
                .enabled(false)
                .build();

        user.setPassword(passwordEncoder.encode(password));

        userRepository.save(user);

        verificationTokenService.sendVerificationEmailToken(user);

        return userMapper.toDto(user);
    }

    public UserDto getUserInfo(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        return userMapper.toDto(user);
    }

    public List<UserDto> getAllUsers() {
        List<UserDto> userDtoList = new ArrayList<>();

        userRepository.findAll()
                .forEach(user ->
                        userDtoList.add(userMapper.toDto(user))
                );

        return userDtoList;
    }

    public void updateUserName(Long userId, ChangeNameRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (user.getName().equals(request.getName())) {
            throw new UnmodifiedDataException("Unmodified name.");
        }

        user.setName(request.getName());
        userRepository.save(user);
    }

    public void updateUserPassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new InvalidRequestDataException("Invalid current password.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new InvalidRequestDataException("Please add a different new password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        userRepository.delete(user);
    }
}

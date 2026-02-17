package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.dto.*;
import com.mahmou.movieChecker.entity.Role;
import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.exception.UnmodifiedUserDataException;
import com.mahmou.movieChecker.exception.UserBadCredentialsException;
import com.mahmou.movieChecker.exception.UserInvalidRequestDataException;
import com.mahmou.movieChecker.exception.UserNotFoundException;
import com.mahmou.movieChecker.mapper.UserMapper;
import com.mahmou.movieChecker.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class UserService {
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

        users.stream()
                .filter(u ->
                        passwordEncoder.matches(password, u.getPassword())
                )
                .findFirst()
                .ifPresent(u -> {
                    throw new UserBadCredentialsException("Cannot use this password.");
                });

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .role(Role.USER)
                .build();

        user.setPassword(passwordEncoder.encode(password));

        userRepository.save(user);

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
            throw new UnmodifiedUserDataException("Unmodified name.");
        }

        user.setName(request.getName());
    }

    public void updateUserEmail(Long userId, ChangeEmailRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (user.getEmail().equals(request.getEmail())) {
            throw new UnmodifiedUserDataException("Unmodified email.");
        }

        user.setEmail(request.getEmail());
    }

    public void updateUserPassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new UserInvalidRequestDataException("Invalid current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
    }

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        userRepository.delete(user);
    }
}

package com.mahmoud.movieChecker.service;

import com.mahmoud.movieChecker.dto.*;
import com.mahmoud.movieChecker.entity.ResetInfoVerificationCode;
import com.mahmoud.movieChecker.entity.Role;
import com.mahmoud.movieChecker.entity.TokenType;
import com.mahmoud.movieChecker.entity.User;
import com.mahmoud.movieChecker.exception.*;
import com.mahmoud.movieChecker.mapper.UserMapper;
import com.mahmoud.movieChecker.repository.ResetInfoVerificationCodeRepository;
import com.mahmoud.movieChecker.repository.UserRepository;
import com.mahmoud.movieChecker.security.jwt.Jwt;
import com.mahmoud.movieChecker.security.jwt.JwtService;
import com.mahmoud.movieChecker.security.jwt.Token;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@AllArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final ResetInfoVerificationCodeRepository resetInfoVerificationCodeRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final VerificationTokenService verificationTokenService;
    private final EmailService emailService;
    private final JwtService jwtService;

    @Transactional
    public UserDto registerUser(RegisterUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new InvalidRequestDataException("Cannot use this email.");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .role(Role.USER)
                .enabled(false)
                .build();

        user.setPassword(passwordEncoder.encode(request.getPassword()));

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

    @Transactional
    public UserIdResponse requestToResetPassword(UserEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow(UserNotFoundException::new);

        Random random = new Random();
        int sixDigitsCode = 100000 + random.nextInt(900000);

        ResetInfoVerificationCode resetInfoVerificationCode = ResetInfoVerificationCode.builder()
                .verificationCode(sixDigitsCode)
                .user(user)
                .expirationDate(LocalDateTime.now().plusMinutes(10))
                .build();

        resetInfoVerificationCodeRepository.save(resetInfoVerificationCode);

        String subject = "Verify your identity — MovieChecker";
        String message = String.format("""
                Hello, %s
                
                We received a request to confirm your identity for a recent change to your MovieChecker account.
                
                Your verification code is:
                
                %d
                
                This code will expire in 10 minutes.
                
                If you did not make this request, please ignore this email. Your account remains secure.
                
                — MovieChecker Team""",
                user.getName(),
                sixDigitsCode
        );

        emailService.sendEmail(user.getEmail(), subject, message);

        return new UserIdResponse(user.getId());
    }

    @Transactional
    public JwtResponse verifyToResetPassword(Long userId, Integer code) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        user.getResetInfoVerificationCodeList().stream()
                .filter(c ->
                    c.getVerificationCode().equals(code) &&
                    c.getExpirationDate().isAfter(LocalDateTime.now())
                )
                .findFirst()
                .orElseThrow(InvalidVerificationEmailCodeException::new);

        resetInfoVerificationCodeRepository.deleteAllByUser(user);

        Jwt resetToken = jwtService.generateResetToken(new Token(user.getId(), user.getEmail(), user.getRole(), TokenType.RESET_PASSWORD));

        return new JwtResponse(resetToken.toString());
    }

    public void resetPassword(Long userId, ResetPasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}

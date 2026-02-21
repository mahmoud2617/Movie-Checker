package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.entity.VerificationToken;
import com.mahmou.movieChecker.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VerificationTokenService {
    @Value("${websiteBackendUrl}")
    private String websiteUrl;

    private final EmailService emailService;
    private final VerificationTokenRepository verificationTokenRepository;

    public void sendVerificationEmailToken(User user) {
        String link = websiteUrl + "/auth/verify?token=" + generateVerificationToken(user);

        String expirationTime = LocalDateTime.now()
                            .plusHours(4)
                            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        String subject = "Verify your Movie Checker account";

        String message = String.format("""
                Welcome to Movie Checker, %s!
                
                To complete your registration and secure your account, please click the link below to verify your email address:
                
                %s
                
                Note: This link is valid for a limited time and will expire on %s.
                
                If you did not create an account, you can safely ignore this email.
                """,
                user.getName(),
                link,
                expirationTime
        );

        emailService.sendEmail(
            user.getEmail(),
            subject,
            message
        );
    }

    private String generateVerificationToken(User user) {
        String token = UUID.randomUUID().toString();

        VerificationToken verificationToken = new VerificationToken();
        verificationToken.setToken(token);
        verificationToken.setUser(user);
        verificationToken.setExpirationDate(LocalDateTime.now().plusHours(4));

        verificationTokenRepository.save(verificationToken);

        return token;
    }
}

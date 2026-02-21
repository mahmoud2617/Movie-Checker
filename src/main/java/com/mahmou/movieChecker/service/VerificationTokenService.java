package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.entity.VerificationToken;
import com.mahmou.movieChecker.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

        String message = String.format("""
                Click to verify: %s
                
                Please note that verification URL will expire on %s""",
                link, LocalDateTime.now().plusHours(4)
        );

        emailService.sendEmail(
            user.getEmail(),
            "Verify your account.",
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

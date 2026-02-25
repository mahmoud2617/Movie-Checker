package com.mahmoud.movieChecker.config;

import com.mahmoud.movieChecker.entity.Role;
import com.mahmoud.movieChecker.entity.User;
import com.mahmoud.movieChecker.repository.UserRepository;
import com.mahmoud.movieChecker.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${APP_ADMIN_NAME}")
    private String adminName;

    @Value("${APP_ADMIN_EMAIL}")
    private String adminEmail;

    @Value("${APP_ADMIN_PASSWORD}")
    private String adminPassword;

    @Transactional
    @Override
    public void run(String... args) {
        if (adminName.isBlank() || adminEmail.isBlank() || adminPassword.isBlank())
            return;

        if (userRepository.existsByRole(Role.ADMIN) || userRepository.existsByEmail(adminEmail))
            return;

        User admin = User.builder()
                .name(adminName)
                .email(adminEmail)
                .role(Role.ADMIN)
                .password(passwordEncoder.encode(adminPassword))
                .enabled(true)
                .joinDate(LocalDate.now())
                .build();

        userRepository.save(admin);

        String subject = "Movie Checker: Admin Role Assigned";

        String message = String.format("""
                Hi %s,

                Welcome to the admin team! Your role on Movie Checker has been updated to Admin.

                You now have full access to the management tools. If you didn't expect this change, please contact the system owner immediately.

                Happy moderating!""",
                adminName
        );

        emailService.sendEmail(adminEmail, subject, message);
    }
}

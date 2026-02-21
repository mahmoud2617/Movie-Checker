package com.mahmou.movieChecker.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailService {
    @Value("${spring.mail.username}")
    private String appEmail;

    private final JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String text) {
        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setFrom(appEmail);
        mailMessage.setTo(to);
        mailMessage.setSubject(subject);
        mailMessage.setText(text);

        mailSender.send(mailMessage);
    }

    // Coming update: this function will be called from UserMoviesService async
    public void sendYearlyEmail(String to, String userName, List<String> topMovies) {
        int lastYear = LocalDate.now().getYear() - 1;
        int i = 1;

        StringBuilder topMoviesMessage = new StringBuilder();

        for (String movie : topMovies) {
            topMoviesMessage.append((i++)).append(". ").append(movie).append('\n');
        }

        String message = String.format("""
                Good morning, %s
                Happy new year!
                We hope you enjoyed in %d, And we wish you happiness this year.
                
                Here are top %d movies you liked in %d
                %s
                """,
                userName, lastYear, topMovies.size(), lastYear, topMoviesMessage
                );


        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setFrom(appEmail);
        mailMessage.setTo(to);
        mailMessage.setSubject("Top "+ topMovies.size() + " movies you liked in " + lastYear);
        mailMessage.setText(message);

        mailSender.send(mailMessage);
    }
}

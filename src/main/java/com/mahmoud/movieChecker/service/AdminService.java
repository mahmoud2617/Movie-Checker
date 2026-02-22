package com.mahmoud.movieChecker.service;

import com.mahmoud.movieChecker.dto.ChangeRoleRequest;
import com.mahmoud.movieChecker.entity.User;
import com.mahmoud.movieChecker.exception.UserNotFoundException;
import com.mahmoud.movieChecker.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class AdminService {
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public void changeRole(ChangeRoleRequest request) {
        User user = userRepository.findById(request.getId()).orElseThrow(UserNotFoundException::new);

        user.setRole(request.getRole());
        userRepository.save(user);

        String subject = "You’ve been promoted to Admin!";

        String message = String.format("""
                Hi %s,
                
                Welcome to the admin team! Your role on Movie Checker has been updated to Admin.
                
                You now have full access to the management tools. If you didn't expect this change, please contact the system owner immediately.
                
                Best regards,
                The Movie Checker Team"""
                , user.getName());

        emailService.sendEmail(user.getEmail(), subject, message);
    }
}

package com.mahmou.movieChecker.service;

import com.mahmou.movieChecker.dto.ChangeRoleRequest;
import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.exception.UserNotFoundException;
import com.mahmou.movieChecker.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class AdminService {
    private final UserRepository userRepository;

    public void changeRole(ChangeRoleRequest request) {
        User user = userRepository.findById(request.getId()).orElseThrow(UserNotFoundException::new);

        user.setRole(request.getRole());
        userRepository.save(user);
    }
}

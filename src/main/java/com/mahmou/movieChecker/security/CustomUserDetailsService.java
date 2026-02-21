package com.mahmou.movieChecker.security;

import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.exception.UserNotFoundException;
import com.mahmou.movieChecker.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UserNotFoundException {
        User user = userRepository.findByEmail(email).orElseThrow(UserNotFoundException::new);

        return new CustomUserDetails(user);
    }
}

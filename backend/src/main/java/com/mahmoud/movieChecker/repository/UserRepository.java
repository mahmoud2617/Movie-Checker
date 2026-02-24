package com.mahmoud.movieChecker.repository;

import com.mahmoud.movieChecker.entity.Role;
import com.mahmoud.movieChecker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByRole(Role role);
}

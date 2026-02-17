package com.mahmou.movieChecker.repository;

import com.mahmou.movieChecker.entity.UserMovies;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserMoviesRepository extends JpaRepository<UserMovies, Long> {
}

package com.mahmou.movieChecker.repository;

import com.mahmou.movieChecker.entity.MovieDetails;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovieDetailsRepository extends JpaRepository<MovieDetails, Long> {
}

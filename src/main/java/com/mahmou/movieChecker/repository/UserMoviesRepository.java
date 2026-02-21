package com.mahmou.movieChecker.repository;

import com.mahmou.movieChecker.entity.MovieStatus;
import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.entity.UserMovies;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserMoviesRepository extends JpaRepository<UserMovies, Long> {

    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.movieDetails.title = :movieTitle AND um.user = :user""")
    Optional<UserMovies> findMovieByMovieTitleAndUser(
        @Param("movieTitle") String movieTitle,
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.user = :user""")
    List<UserMovies> findAllUserMoviesByUser(
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.status = :status AND um.user = :user""")
    List<UserMovies> findAllUserMoviesByStatusUser(
        @Param("status") MovieStatus status,
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.isFavorite = :favorite AND um.user = :user""")
    List<UserMovies> findAllUserMoviesByFavoriteAndUser(
        @Param("favorite") Boolean favorite,
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.status = :status AND um.isFavorite = :favorite AND um.user = :user""")
    List<UserMovies> findAllUserMoviesByStatusAndFavoriteAndUser(
        @Param("status") MovieStatus status,
        @Param("favorite") Boolean favorite,
        @Param("user") User user
    );
}

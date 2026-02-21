package com.mahmou.movieChecker.repository;

import com.mahmou.movieChecker.entity.MovieDetails;
import com.mahmou.movieChecker.entity.MovieStatus;
import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.entity.UserMovies;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserMoviesRepository extends JpaRepository<UserMovies, Long> {

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE
                LOWER(um.movieDetails.title) LIKE LOWER(CONCAT('%', :movieTitle, '%'))
                AND um.user = :user""")
    List<UserMovies> findByMovieTitleIgnoreCaseAndUser(
        @Param("movieTitle") String movieTitle,
        @Param("user") User user,
        Pageable pageable
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.movieDetails = :movieDetails AND um.user = :user""")
    Optional<UserMovies> findByMovieDetailsAndUser(
        @Param("movieDetails") MovieDetails movieDetails,
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.user = :user""")
    List<UserMovies> findAllByUser(
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.status = :status AND um.user = :user""")
    List<UserMovies> findAllByStatusAndUser(
        @Param("status") MovieStatus status,
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.isFavorite = :favorite AND um.user = :user""")
    List<UserMovies> findAllByFavoriteAndUser(
        @Param("favorite") Boolean favorite,
        @Param("user") User user
    );

    @EntityGraph(attributePaths = "movieDetails")
    @Query("""
            SELECT um FROM UserMovies um
            WHERE um.status = :status AND um.isFavorite = :favorite AND um.user = :user""")
    List<UserMovies> findAllByStatusAndFavoriteAndUser(
        @Param("status") MovieStatus status,
        @Param("favorite") Boolean favorite,
        @Param("user") User user
    );
}

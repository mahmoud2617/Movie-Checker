package com.mahmoud.movieChecker.repository;

import com.mahmoud.movieChecker.entity.MovieDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface MovieDetailsRepository extends JpaRepository<MovieDetails, Long> {
    @Query("SELECT md FROM MovieDetails md")
    Set<MovieDetails> findAllMovieDetails();

    Optional<MovieDetails> findByTitleIgnoreCase(String movieTitle);

    @Query("SELECT md.title FROM MovieDetails md")
    List<String> findAllMoviesTitles();

    @Query(value = """
            SELECT * FROM movie_checker.movie_details
            WHERE
                title ILIKE :q || '%'
                OR movie_checker.similarity(title, CAST(:q AS text)) > 0.3
                OR search_vector @@ websearch_to_tsquery(:q)
            ORDER BY (
                CASE
                    WHEN title ILIKE :q THEN 3.0
                    WHEN title ILIKE :q || '%' THEN 2.0
                    ELSE 0
                END
                +
                GREATEST (
                    movie_checker.similarity(title, CAST(:q AS text)),
                    ts_rank_cd(search_vector, websearch_to_tsquery(:q))
                )
            ) DESC
            LIMIT 20""",
            nativeQuery = true)
    List<MovieDetails> search(@Param("q") String q);

    @Query(value = """
            SELECT title FROM movie_checker.movie_details
            WHERE title ILIKE :q || '%'
            ORDER BY title""",
            nativeQuery = true)
    List<String> suggest(@Param("q") String q);

    @Query("SELECT md FROM MovieDetails md WHERE md.imdbId = :imdbId")
    Optional<MovieDetails> findByImdbId(@Param("imdbId") String imdbId);
}

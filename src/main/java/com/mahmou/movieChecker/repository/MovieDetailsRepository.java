package com.mahmou.movieChecker.repository;

import com.mahmou.movieChecker.entity.MovieDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MovieDetailsRepository extends JpaRepository<MovieDetails, Long> {
    Optional<MovieDetails> findByTitleIgnoreCase(String movieTitle);

    @Query("SELECT md.title FROM MovieDetails md")
    List<String> findAllMoviesTitles();

    @Query(value = """
            SELECT * FROM movie_checker.movie_details
            WHERE
                title ILIKE ?1 || '%'
                OR similarity(title, ?1) > 0.3
                OR search_vector @@ websearch_to_tsquery(?1)
            ORDER BY (
                CASE
                    WHEN title ILIKE ?1 THEN 3.0
                    WHEN title ILIKE ?1 || '%' THEN 2.0
                    ELSE 0
                END
                +
                GREATEST (
                    similarity(title, ?1),
                    ts_rank_cd(search_vector, websearch_to_tsquery(?1))
                )
            ) DESC
            LIMIT 20;""",
            nativeQuery = true)
    List<MovieDetails> search(String q);

    @Query(value = """
            SELECT title FROM movie_checker.movie_details
            WHERE title ILIKE ?1 || '%'
            ORDER BY title""",
            nativeQuery = true)
    List<String> suggest(String q);
}

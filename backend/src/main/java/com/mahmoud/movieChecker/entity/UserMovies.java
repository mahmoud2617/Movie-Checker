package com.mahmoud.movieChecker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;

@Entity
@Table(name = "user_movies", schema="movie_checker")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserMovies {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_rate")
    private Double userRate;

    @Column(name = "status", columnDefinition = "movie_checker.enum_watch_status")
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private MovieStatus status;

    @Column(name = "is_favorite")
    private Boolean isFavorite;

    @Column(name = "added_at")
    private LocalDate addedAt;

    @ManyToOne
    @JoinColumn(name = "movie_details_id")
    private MovieDetails movieDetails;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}

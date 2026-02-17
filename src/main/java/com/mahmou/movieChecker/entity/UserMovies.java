package com.mahmou.movieChecker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "user_movies")
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

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private MovieStatus status;

    @Column(name = "is_favorite")
    private boolean isFavorite;

    @Column(name = "added_at")
    private LocalDate addedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_details_id")
    private MovieDetails movieDetails;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}

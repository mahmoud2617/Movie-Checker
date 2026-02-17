package com.mahmou.movieChecker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "movie_details")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MovieDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "poster_url")
    private String posterUrl;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "category")
    private String category;

    @Column(name = "overview")
    private String overview;

    @Column(name = "imdb_rate")
    private String imdbRate;

    @OneToMany(mappedBy = "movieDetails")
    private Set<UserMovies> userMoviesList = new HashSet<>();
}

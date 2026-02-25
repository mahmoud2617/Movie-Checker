package com.mahmoud.movieChecker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "imdb_id")
    private String imdbId;

    @Column(name = "title")
    private String title;

    @Column(name = "year")
    private Integer year;

    @Column(name = "poster_url")
    private String posterUrl;

    @Column(name = "genre")
    private String genre;

    @Column(name = "type")
    private String type;

    @Column(name = "overview")
    private String overview;

    @Column(name = "runtime")
    private String runtime;

    @Column(name = "imdb_rate")
    private Double imdbRate;

    @JsonIgnore
    @OneToMany(mappedBy = "movieDetails")
    private Set<UserMovies> userMoviesList = new HashSet<>();
}

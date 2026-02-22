package com.mahmoud.movieChecker.dto;

public record RetrievedDataFromOmdbApi (
    String imdbID,
    String Title,
    String Year,
    String Runtime,
    String Genre,
    String Plot,
    String Poster,
    String imdbRating,
    String Type
){}

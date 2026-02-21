package com.mahmou.movieChecker.dto;

public record RetrievedDataFromOmdbApi (
    String Title,
    String Year,
    String Runtime,
    String Genre,
    String Plot,
    String Poster,
    String imdbRating,
    String Type
){}

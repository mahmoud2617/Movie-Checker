package com.mahmoud.movieChecker.exception;

public class UserDoesNotHaveTheMovieException extends RuntimeException {
    public UserDoesNotHaveTheMovieException(String message) {
        super(message);
    }
}

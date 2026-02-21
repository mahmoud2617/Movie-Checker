package com.mahmou.movieChecker.exception;

public class UserDoesNotHaveTheMovieException extends RuntimeException {
    public UserDoesNotHaveTheMovieException(String message) {
        super(message);
    }
}

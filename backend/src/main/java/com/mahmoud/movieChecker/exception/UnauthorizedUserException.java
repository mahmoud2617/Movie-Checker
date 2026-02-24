package com.mahmoud.movieChecker.exception;

public class UnauthorizedUserException extends RuntimeException {
    public UnauthorizedUserException() {}

    public UnauthorizedUserException(String message) {
        super(message);
    }
}

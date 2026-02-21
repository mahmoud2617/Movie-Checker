package com.mahmou.movieChecker.exception;

public class InvalidVerificationEmailTokenException extends RuntimeException {
    public InvalidVerificationEmailTokenException() {
    }

    public InvalidVerificationEmailTokenException(String message) {
        super(message);
    }
}

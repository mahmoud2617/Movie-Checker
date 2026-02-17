package com.mahmou.movieChecker.exception;

public class UserBadCredentialsException extends RuntimeException {
    public UserBadCredentialsException() {
    }

    public UserBadCredentialsException(String message) {
        super(message);
    }
}

package com.mahmou.movieChecker.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

@Getter
public class ApiError {
    private final int status;
    private final String message;
    private final LocalDateTime timestamp;

    public ApiError(int status, String message) {
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    public static ApiError notFound(String message) {
        return new ApiError(HttpStatus.NOT_FOUND.value(), message);
    }

    public static ApiError badRequest(String message) {
        return new ApiError(HttpStatus.BAD_REQUEST.value(), message);
    }

    public static ApiError conflict(String message) {
        return new ApiError(HttpStatus.CONFLICT.value(), message);
    }
}

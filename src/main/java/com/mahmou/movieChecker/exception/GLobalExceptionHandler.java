package com.mahmou.movieChecker.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GLobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> errors = new HashMap<>();

        exception.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));

        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException exception
    ) {
        return ResponseEntity.badRequest().body(
            ApiError.badRequest("Invalid parameter value: " + exception.getName())
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleHttpMessageNotReadableException() {
        return ResponseEntity.badRequest().body(
            ApiError.badRequest("Invalid request body.")
        );
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiError> handleUserNotFoundException() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiError.notFound("User not found.")
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrityViolationException() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiError.conflict("This email has already been registered.")
        );
    }

    @ExceptionHandler(UserBadCredentialsException.class)
    public ResponseEntity<ApiError> handleUserBadCredentialsException(
        UserBadCredentialsException exception
    ) {
        String message = (exception.getMessage() == null)? "Bad credentials." : exception.getMessage();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiError.conflict(message)
        );
    }

    @ExceptionHandler(UserInvalidRequestDataException.class)
    public ResponseEntity<ApiError> handleUserInvalidRequestDataException(
        UserInvalidRequestDataException exception
    ) {
        return ResponseEntity.badRequest().body(
            ApiError.badRequest(exception.getMessage())
        );
    }

    @ExceptionHandler(UnmodifiedUserDataException.class)
    public ResponseEntity<ApiError> handleUnmodifiedUserDataException(
        UserInvalidRequestDataException exception
    ) {
        return ResponseEntity.badRequest().body(
            ApiError.badRequest(exception.getMessage())
        );
    }
}

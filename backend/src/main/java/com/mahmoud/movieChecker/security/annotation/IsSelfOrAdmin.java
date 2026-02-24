package com.mahmoud.movieChecker.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("""
        (principal instanceof T(com.mahmoud.movieChecker.security.CustomUserDetails) && principal.id == #userId)
        or hasRole('ADMIN')""")
public @interface IsSelfOrAdmin {
}

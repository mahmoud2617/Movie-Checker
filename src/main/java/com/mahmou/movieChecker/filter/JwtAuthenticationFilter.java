package com.mahmou.movieChecker.filter;

import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.repository.UserRepository;
import com.mahmou.movieChecker.security.CustomUserDetails;
import com.mahmou.movieChecker.security.jwt.Jwt;
import com.mahmou.movieChecker.security.jwt.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.replace("Bearer ", "");

        Jwt jwt = jwtService.parseToken(token);

        if (jwt == null || jwt.isExpired()) {
            filterChain.doFilter(request, response);
            return;
        }

        SecurityContext auth = SecurityContextHolder.getContext();

        // future improvement: cache user
        User user = (auth.getAuthentication() != null)?
                    ((CustomUserDetails) auth.getAuthentication().getPrincipal()).getUser() :
                    userRepository.findById(jwt.getUserId()).orElseThrow(); // <--
        // when trying to remove a resource with a deleted user it throws NoSuchElementException

        CustomUserDetails userDetails = new CustomUserDetails(user);

        var authentication = new UsernamePasswordAuthenticationToken(
            userDetails,
            null,
            userDetails.getAuthorities()
        );

        authentication.setDetails(
            new WebAuthenticationDetailsSource().buildDetails(request)
        );

        auth.setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}

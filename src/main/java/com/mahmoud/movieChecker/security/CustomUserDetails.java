package com.mahmoud.movieChecker.security;

import com.mahmoud.movieChecker.entity.Role;
import com.mahmoud.movieChecker.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {
    private final Long id;
    private final String email;
    private final Role role;
    private final String password;
    private final Boolean enabled;

    public CustomUserDetails(Long id, String email, Role role) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.password = null;
        this.enabled = null;
    }

    public CustomUserDetails(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.password = user.getPassword();
        this.enabled = user.getEnabled();
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}

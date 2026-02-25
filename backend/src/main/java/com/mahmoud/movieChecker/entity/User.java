package com.mahmoud.movieChecker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users", schema="movie_checker")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "email")
    private String email;

    @Column(name = "role", columnDefinition = "movie_checker.enum_user_roles")
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private Role role;

    @Column(name = "password")
    private String password;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "join_date")
    private LocalDate joinDate;

    @JsonIgnore
    @OneToMany(mappedBy = "user", orphanRemoval = true)
    private Set<UserMovies> userMoviesSet = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user", orphanRemoval = true)
    private Set<VerificationToken> verificationTokenSet = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user", orphanRemoval = true)
    private List<ResetInfoVerificationCode> ResetInfoVerificationCodeList = new ArrayList<>();
}

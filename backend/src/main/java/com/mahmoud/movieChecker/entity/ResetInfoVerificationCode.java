package com.mahmoud.movieChecker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reset_info_verification_code", schema="movie_checker")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class ResetInfoVerificationCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "verification_code")
    private Integer verificationCode;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "expiration_date")
    private LocalDateTime expirationDate;
}

package com.mahmou.movieChecker.repository;

import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.entity.VerificationToken;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface VerificationTokenRepository extends CrudRepository<VerificationToken, Long> {
    @EntityGraph(attributePaths = "user")
    Optional<VerificationToken> findByToken(String token);

    @Modifying
    @Transactional
    @Query("""
            DELETE FROM VerificationToken vt
            WHERE vt.user = :user""")
    void deleteAllByUser(@Param("user") User user);
}

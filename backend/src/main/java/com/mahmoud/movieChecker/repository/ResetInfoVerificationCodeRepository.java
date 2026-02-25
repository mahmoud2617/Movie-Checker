package com.mahmoud.movieChecker.repository;

import com.mahmoud.movieChecker.entity.ResetInfoVerificationCode;
import com.mahmoud.movieChecker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ResetInfoVerificationCodeRepository extends JpaRepository<ResetInfoVerificationCode, Long> {
    @Modifying
    @Transactional
    @Query("""
            DELETE FROM ResetInfoVerificationCode rifc
            WHERE rifc.user = :user""")
    void deleteAllByUser(@Param("user") User user);
}

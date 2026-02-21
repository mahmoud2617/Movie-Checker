package com.mahmou.movieChecker.controller;

import com.mahmou.movieChecker.dto.ChangeRoleRequest;
import com.mahmou.movieChecker.service.AdminService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@AllArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @PatchMapping("/users/change-role")
    public ResponseEntity<Void> changeRole(
        @PathVariable Long id,
        ChangeRoleRequest changeRoleRequest
    ) {
        adminService.changeRole(changeRoleRequest);

        return ResponseEntity.ok().build();
    }
}

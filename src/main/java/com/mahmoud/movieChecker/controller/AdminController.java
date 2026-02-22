package com.mahmoud.movieChecker.controller;

import com.mahmoud.movieChecker.dto.ChangeRoleRequest;
import com.mahmoud.movieChecker.service.AdminService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@AllArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @PatchMapping("/users/change-role")
    public ResponseEntity<Void> changeRole(
        ChangeRoleRequest changeRoleRequest
    ) {
        adminService.changeRole(changeRoleRequest);

        return ResponseEntity.ok().build();
    }
}

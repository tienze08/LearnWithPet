package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.OnboardingRequest;
import com.vocabpet.backend.dto.UserResponse;
import com.vocabpet.backend.service.UserService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import java.io.IOException;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.filter.OncePerRequestFilter;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponse me(
            Authentication authentication) {

        return userService
                .getCurrentUser(authentication);
    }

    @PostMapping("/onboarding")
    public ResponseEntity<UserResponse> onboarding(
            @RequestBody OnboardingRequest request,
            Authentication authentication) {
        userService.completeOnboarding(authentication, request);

        return ResponseEntity.ok(
                userService.getCurrentUser(authentication));
    }

    @Component
    public class RequestLogFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain filterChain) throws ServletException, IOException {

            filterChain.doFilter(request, response);
        }
    }
}
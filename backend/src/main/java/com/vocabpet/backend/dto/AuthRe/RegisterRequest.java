package com.vocabpet.backend.dto.AuthRe;

import lombok.Data;

@Data
public class RegisterRequest {

    private String email;
    private String password;
    private String name;

}
package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Role;
import com.app.webnongsan.util.annotation.ApiMessage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    @GetMapping("/")
    @ApiMessage("Hello")
    public ResponseEntity<String> hello(){
        return ResponseEntity.ok("Hello");
    }
}
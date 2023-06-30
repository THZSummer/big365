package com.mlj.share.bigdata365.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/")
public class HelloBigdata365Controller {

    @GetMapping
    public String helloJdbc() {
        return "Hello Bigdata365!";
    }

}


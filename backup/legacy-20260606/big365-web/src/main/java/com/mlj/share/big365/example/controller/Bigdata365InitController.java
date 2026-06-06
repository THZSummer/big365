package com.mlj.share.big365.example.controller;

import com.mlj.share.big365.example.service.Bigdata365InitServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController()
@RequestMapping("/api/v1/bigdata365/init")
public class Bigdata365InitController {

    Bigdata365InitServiceI bigdata365InitServiceI;

    @PostMapping("/dimension/r")
    public boolean createBig365Dimension() {
        return bigdata365InitServiceI.dropBig365Dimension();
    }

    @DeleteMapping("/dimension/r")
    public boolean dropBig365Dimension() {
        return bigdata365InitServiceI.dropBig365Dimension();
    }

    @Autowired
    public void setBigdata365InitServiceI(Bigdata365InitServiceI bigdata365InitServiceI) {
        this.bigdata365InitServiceI = bigdata365InitServiceI;
    }
}

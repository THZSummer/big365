package com.mlj.share.bigdata365.controller;

import com.mlj.share.bigdata365.service.Bigdata365ServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController()
@RequestMapping("/api/v1/bigdata365")
public class Bigdata365Controller {


    Bigdata365ServiceI bigdata365ServiceI;

    @GetMapping("/s/list")
    public List<Map<String, Object>> list() {
        return bigdata365ServiceI.list();
    }

    @GetMapping("/r/{id}")
    public Map<String, Object> findOne(@PathVariable("id") int id) {
        return bigdata365ServiceI.findOne(id);
    }

    @PostMapping("/r/{id}")
    public Map<String, Object> crateOne(@PathVariable("id") int id) {
        return bigdata365ServiceI.findOne(id);
    }

    @PutMapping("/r/{id}")
    public Map<String, Object> updateOne(@PathVariable("id") int id) {
        return bigdata365ServiceI.findOne(id);
    }

    @DeleteMapping("/r/{id}")
    public Map<String, Object> deleteOne(@PathVariable("id") int id) {
        return bigdata365ServiceI.findOne(id);
    }

    @Autowired
    public void setBigdata365ServiceI(Bigdata365ServiceI bigdata365ServiceI) {
        this.bigdata365ServiceI = bigdata365ServiceI;
    }
}

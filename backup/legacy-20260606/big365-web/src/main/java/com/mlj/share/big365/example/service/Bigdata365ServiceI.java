package com.mlj.share.big365.example.service;

import java.util.List;
import java.util.Map;

public interface Bigdata365ServiceI {
    List<Map<String, Object>> list();

    Map<String, Object> findOne(int id);
}

package com.mlj.share.bigdata365.service.impl;

import com.mlj.share.bigdata365.mapper.Bigdata365Mapper;
import com.mlj.share.bigdata365.mapper.DimensionMapper;
import com.mlj.share.bigdata365.service.Bigdata365ServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class Bigdata365ServiceImpl implements Bigdata365ServiceI {

    @Autowired
    Bigdata365Mapper bigdata365Mapper;

    @Autowired
    DimensionMapper dimensionMapper;


    @Override
    public List<Map<String, Object>> list() {
        return bigdata365Mapper.list();
    }

    @Override
    public Map<String, Object> findOne(int id) {
        return bigdata365Mapper.findOne(id);
    }
}

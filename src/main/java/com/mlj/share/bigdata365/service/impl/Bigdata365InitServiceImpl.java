package com.mlj.share.bigdata365.service.impl;

import com.mlj.share.bigdata365.mapper.Bigdata365InitMapper;
import com.mlj.share.bigdata365.service.Bigdata365InitServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class Bigdata365InitServiceImpl implements Bigdata365InitServiceI {

    Bigdata365InitMapper bigdata365InitMapper;

    @Override
    public boolean dropBig365Dimension() {
        return bigdata365InitMapper.dropBig365Dimension() == 1;
    }

    @Override
    public boolean createBig365Dimension() {
        return bigdata365InitMapper.createBig365Dimension() == 1;
    }

    @Autowired
    public void setBigdata365InitMapper(Bigdata365InitMapper bigdata365InitMapper) {
        this.bigdata365InitMapper = bigdata365InitMapper;
    }
}

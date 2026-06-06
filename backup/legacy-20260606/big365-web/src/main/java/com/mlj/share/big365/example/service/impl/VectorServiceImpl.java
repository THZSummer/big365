package com.mlj.share.big365.example.service.impl;

import com.mlj.share.big365.example.service.DimensionServiceI;
import com.mlj.share.big365.example.service.VectorServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VectorServiceImpl implements VectorServiceI {

    @Autowired
    DimensionServiceI dimensionServiceI;


}

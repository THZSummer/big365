package com.mlj.share.bigdata365.service.impl;

import com.mlj.share.bigdata365.bean.Coordinate;
import com.mlj.share.bigdata365.bean.DimensionEnum;
import com.mlj.share.bigdata365.bean.Vector;
import com.mlj.share.bigdata365.service.DimensionServiceI;
import com.mlj.share.bigdata365.service.VectorServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Service
public class VectorServiceImpl implements VectorServiceI {

    @Autowired
    DimensionServiceI dimensionServiceI;


    @Override
    public Vector parseFromDimensions(Supplier<Map<DimensionEnum, List<String>>> supplier) {
        supplier.get().forEach((dimensionEnum, strings) -> strings.forEach(s ->
                dimensionServiceI.parseFromString(dimensionEnum, s)
        ));
        return null;
    }

    @Override
    public Vector parseFromDimensions(List<Coordinate> coordinates) {
        Vector vector = new Vector();
        vector.setVectorCoordinate(coordinates);
        return vector;
    }
}

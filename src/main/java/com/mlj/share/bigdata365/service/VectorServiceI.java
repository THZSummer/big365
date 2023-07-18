package com.mlj.share.bigdata365.service;

import com.mlj.share.bigdata365.bean.Coordinate;
import com.mlj.share.bigdata365.bean.DimensionEnum;
import com.mlj.share.bigdata365.bean.Vector;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

public interface VectorServiceI {

    /**
     * 坐标向量化
     * @param supplier 坐标
     * @return 向量
     */
    Vector parseFromDimensions(Supplier<Map<DimensionEnum, List<String>>> supplier);

    /**
     * 坐标向量化
     * @param coordinates 坐标列表
     * @return 向量
     */
    Vector parseFromDimensions(List<Coordinate> coordinates);
}

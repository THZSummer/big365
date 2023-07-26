package com.mlj.share.big365.core.factory;

import com.mlj.share.big365.core.entries.Coordinate;
import com.mlj.share.big365.core.entries.Vector;

import java.util.List;

public interface VectorManager {


    /**
     * 坐标向量化
     * @param coordinates 坐标列表
     * @return 向量
     */
    Vector parseFromDimensions(List<Coordinate> coordinates);
}

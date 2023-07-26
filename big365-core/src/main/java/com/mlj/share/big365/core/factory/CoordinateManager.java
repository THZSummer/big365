package com.mlj.share.big365.core.factory;

import com.mlj.share.big365.core.entries.Coordinate;

public interface CoordinateManager {

    /**
     * 数据坐标化
     * @param dimension 维度类型
     * @param val 维度坐标值
     * @return 维度坐标
     */
    Coordinate parseFromString(String dimension, String val);
}

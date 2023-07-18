package com.mlj.share.bigdata365.service;

import com.mlj.share.bigdata365.bean.Coordinate;
import com.mlj.share.bigdata365.bean.Dimension;
import com.mlj.share.bigdata365.bean.DimensionEnum;

import java.util.List;

public interface DimensionServiceI {
    int create(Dimension dimension);

    int remove(Dimension dimension);

    int removeByPid(String pid);

    int modified(Dimension dimension);

    Dimension find(Dimension dimension);

    Dimension findByPid(String pid);

    List<Dimension> findList(Dimension dimension);

    /**
     * 数据坐标化
     * @param dimensionEnum 维度类型
     * @param val 维度坐标值
     * @return 维度坐标
     */
    Coordinate parseFromString(DimensionEnum dimensionEnum, String val);
}

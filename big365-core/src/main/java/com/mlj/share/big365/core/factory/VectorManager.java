package com.mlj.share.big365.core.factory;

import com.mlj.share.big365.core.entries.CoordinateO;
import com.mlj.share.big365.core.entries.VectorO;

import java.util.List;

public interface VectorManager {


    /**
     * 坐标向量化
     * @param coordinateOS 坐标列表
     * @return 向量
     */
    VectorO parseFromDimensions(List<CoordinateO> coordinateOS);
}

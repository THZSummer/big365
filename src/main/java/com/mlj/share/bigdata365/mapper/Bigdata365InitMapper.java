package com.mlj.share.bigdata365.mapper;

import org.apache.ibatis.annotations.Mapper;

/**
 * 2021/12/16：
 *
 * @author MLJ
 */

@Mapper
public interface Bigdata365InitMapper {

    int dropBig365Dimension();

    int createBig365Dimension();
}

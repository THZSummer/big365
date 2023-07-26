package com.mlj.share.big365.example.mapper;

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

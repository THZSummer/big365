package com.mlj.share.big365.example.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

/**
 * 2021/12/16：
 *
 * @author MLJ
 */

@Mapper
public interface Bigdata365Mapper {

    List<Map<String, Object>> list();

    Map<String, Object> findOne(int id);
}

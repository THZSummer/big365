package com.mlj.share.big365.example.mapper;

import com.mlj.share.big365.example.vo.Dimension;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * 2021/12/16：
 *
 * @author MLJ
 */

@Mapper
public interface DimensionMapper {

    int insert(Dimension dimension);

    int delete(Dimension dimension);

    int deleteByPid(String pid);

    int update(Dimension dimension);

    Dimension select(Dimension dimension);

    Dimension selectByPid(String pid);

    List<Dimension> selectList(Dimension dimension);
}

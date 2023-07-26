package com.mlj.share.big365.example.config;


import com.alibaba.druid.pool.DruidDataSource;
import com.alibaba.druid.support.jakarta.StatViewServlet;
import com.alibaba.druid.support.jakarta.WebStatFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableConfigurationProperties(value = DruidDataSourceProperties.class)
public class DruidDataSourceConfig {

    @Autowired
    private DruidDataSourceProperties druidDataSourceProperties;

//    @Autowired
//    public DruidDataSourceProperties getDruidDataSourceProperties() {
//        return druidDataSourceProperties;
//    }

    /**
     * 添加 DruidDataSource 组件到容器中，并绑定属性
     */
    @Bean
    public DataSource dataSource() throws Exception {
        DruidDataSource druidDataSource = new DruidDataSource();
        druidDataSource.setUsername(druidDataSourceProperties.getUsername());
        druidDataSource.setPassword(druidDataSourceProperties.getPassword());
        druidDataSource.setUrl(druidDataSourceProperties.getJdbcUrl());
        druidDataSource.setDriverClassName(druidDataSourceProperties.getDriverClassName());
        druidDataSource.setInitialSize(druidDataSourceProperties.getInitialSize());
        druidDataSource.setMinIdle(druidDataSourceProperties.getMinIdle());
        druidDataSource.setMaxActive(druidDataSourceProperties.getMaxActive());
        druidDataSource.setMaxWait(druidDataSourceProperties.getMaxWait());
        druidDataSource.setPasswordCallbackClassName(druidDataSourceProperties.getPasswordCallbackClassName());
        druidDataSourceProperties.setPoolPreparedStatements(druidDataSourceProperties.isPoolPreparedStatements());
        return druidDataSource;
    }

    /**
     * 配置 Druid 监控管理后台的Servlet；
     * 内置 Servlet 容器时没有web.xml文件，所以使用 Spring Boot 的注册 Servlet 方式
     */
    @Bean
    @ConditionalOnClass(DruidDataSource.class)
    public ServletRegistrationBean<StatViewServlet> statViewServlet(){
        // 这些参数可以在 http.StatViewServlet 的父类 ResourceServlet 中找到
        Map<String,String> initParams = new HashMap<>();
        initParams.put("loginUsername","admin");
        initParams.put("loginPassword","123456");
        // allow：Druid 后台允许谁可以访问。默认就是允许所有访问。
        initParams.put("allow",""); // 后面参数为空则所有人都能访问，一般会写一个具体的ip或ip段
        // deny：Druid 后台禁止谁能访问
        // initParams.put("deny","192.168.10.132");

        // 注册一个servlet，同时表明/druid/* 这个请求会走到这个servlet，而druid内置了这个请求的接收
        ServletRegistrationBean<StatViewServlet> bean = new ServletRegistrationBean<>(new StatViewServlet(), "/druid/*");
        bean.setInitParameters(initParams);
        return bean;
    }

    /**
     * 配置一个web监控的filter
     */
    @Bean
    @ConditionalOnClass(DruidDataSource.class)
    public FilterRegistrationBean<WebStatFilter> webStatFilter(){
        Map<String,String> initParams = new HashMap<>();
        // 这些不进行统计
        initParams.put("exclusions","*.js,*.css,/druid/*");

        FilterRegistrationBean<WebStatFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new WebStatFilter());
        bean.setInitParameters(initParams);
        bean.setUrlPatterns(List.of("/*"));
        return  bean;
    }

    @Bean
    JdbcTemplate createJdbcTemplate(@Autowired DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
package com.mlj.share.big365.example.config;

import com.alibaba.druid.util.DruidPasswordCallback;
import io.micrometer.common.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Properties;

public class DruidCustomPasswordCallback extends DruidPasswordCallback {

    @Override
    public void setProperties(Properties properties) {
        super.setProperties(properties);
        // 获取配置文件中的已经加密的密码（spring.datasource.druid.connect-properties.password）
        String pwd = (String)properties.get("password");
        if (StringUtils.isNotEmpty(pwd)) {
            try {
                // 这里的代码是将密码进行解密，并设置
                String password = decodePassword(pwd);
                setPassword(password.toCharArray());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private static String decodePassword(String pwd) {
        return new String(Base64.getDecoder().decode(pwd.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
    }

    private static String encodePassword(String pwd) {
        return Base64.getEncoder().encodeToString(pwd.getBytes(StandardCharsets.UTF_8));
    }

    public static void main(String[] args) {
        System.out.println(encodePassword("bigdata365"));
        System.out.println(decodePassword("YmlnZGF0YTM2NQ=="));
    }
}

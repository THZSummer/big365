package org.big365.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI big365OpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("big365 API")
                        .description("big365 多维数据服务 REST API")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("big365")
                                .url("https://gitee.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}

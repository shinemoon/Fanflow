// 定义所有全局常量
const API_CONFIG = {
    CONSUMER_KEY: "e5dd03165aebdba16611e1f4849ce2c3",
    CONSUMER_SECRET: "2a14fcbdebfb936a769840b4d5a9263b",
    FANFOU_API_BASE: "http://api.fanfou.com",
    FANFOU_AUTH_BASE: "http://fanfou.com/oauth"
};

// 暴露到全局作用域
Object.assign(self, API_CONFIG);

//  临时借用Prefix的Key和Secret
//const CONSUMER_KEY = "11d4291ccc71b962d657b47006411831";
//const CONSUMER_SECRET = "9d71fb4415e2ccb1f516144d7fb922ab";
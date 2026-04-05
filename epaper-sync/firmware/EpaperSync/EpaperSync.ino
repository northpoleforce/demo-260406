/*
  e1001-Remote-Renderer
  ----------------------
  基于 reTerminal E1001 (XIAO ESP32S3) 的远程渲染固件。
  功能：
  1. 通过 Wi-Fi 联网。
  2. 订阅 MQTT 主题 'e1001/cmd/update'。
  3. 当收到下载 URL 时，自动获取并渲染 800x480 的 1-bit RAW 图像。
*/

#include "driver.h"
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <TFT_eSPI.h> // 需要安装 TFT_eSPI 库且正确配置 User_Setup.h
#include <WiFi.h>

// ================= Wi-Fi 与 MQTT 配置 =================
const char *ssid = "zwlhp";                    // [需修改] 您的 Wi-Fi 名称
const char *password = "zwl666888";            // [需修改] 您的 Wi-Fi 密码
const char *mqtt_server = "broker.emqx.io";    // 公共 MQTT 代理
const char *update_topic = "e1001/cmd/update"; // 订阅主题
// =====================================================

EPaper epaper = EPaper();
WiFiClient espClient;
PubSubClient client(espClient);

String downloadUrl = "";
bool needUpdate = false;

// MQTT 消息回调函数
void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("收到信令 [");
  Serial.print(topic);
  Serial.print("]: ");

  String url = "";
  for (int i = 0; i < length; i++) {
    url += (char)payload[i];
  }
  Serial.println(url);

  if (url.startsWith("http")) {
    downloadUrl = url;
    needUpdate = true;
  }
}

// Wi-Fi 连接函数
void setupWiFi() {
  delay(10);
  Serial.println();
  
  // 初始化为 Station 模式并断开之前的连接
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  epaper.fillScreen(TFT_WHITE);
  epaper.drawCentreString("Scanning for Wi-Fi (2.4GHz)...", 400, 40, 4);
  epaper.update();

  Serial.println("Starting WiFi scan...");
  int n = WiFi.scanNetworks();
  Serial.println("Scan done");

  epaper.fillScreen(TFT_WHITE);
  if (n == 0) {
    epaper.drawCentreString("No networks found!", 400, 40, 4);
  } else {
    epaper.drawCentreString("Available Networks:", 400, 20, 4);
    int yOff = 60;
    // 最多显示 10 个信号，避免超出屏幕
    for (int i = 0; i < n && i < 10; ++i) {
      String wifiInfo = String(i + 1) + ". " + WiFi.SSID(i) + " (" + String(WiFi.RSSI(i)) + "dBm)";
      Serial.println(wifiInfo);
      epaper.drawCentreString(wifiInfo, 400, yOff, 4);
      yOff += 30;
    }
  }
  epaper.drawCentreString("Connecting to: " + String(ssid), 400, 380, 4);
  epaper.update();

  delay(3000); // 让用户看清扫描结果
  
  WiFi.begin(ssid, password);
  
  // 增加超时机制，最多等20秒，避免彻底死机
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  epaper.fillScreen(TFT_WHITE);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("Wi-Fi 已连接");
    Serial.print("IP 地址: ");
    Serial.println(WiFi.localIP());

    epaper.drawCentreString("Wi-Fi Connected!", 400, 220, 4);
    epaper.drawCentreString(WiFi.localIP().toString(), 400, 260, 4);
  } else {
    Serial.println("");
    Serial.println("Wi-Fi 连接超时失败！");
    epaper.drawCentreString("Connection Failed!", 400, 220, 4);
    epaper.drawCentreString("Check your 2.4G Router", 400, 260, 4);
  }
  epaper.update();
}

// MQTT 重连函数
void reconnect() {
  while (!client.connected()) {
    Serial.print("正在尝试连接 MQTT...");
    
    epaper.fillScreen(TFT_WHITE);
    epaper.drawCentreString("Connecting to MQTT...", 400, 240, 4);
    epaper.update();
    
    // 创建一个随机 ID
    String clientId = "E1001Client-";
    clientId += String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("已连接");
      client.subscribe(update_topic);
      Serial.println("已订阅主题: " + String(update_topic));

      epaper.fillScreen(TFT_WHITE);
      epaper.drawCentreString("Ready!", 400, 220, 4);
      epaper.drawCentreString("Waiting for render signal...", 400, 260, 4);
      epaper.update();
    } else {
      Serial.print("失败, rc=");
      Serial.print(client.state());
      Serial.println(" 5秒后重试");
      
      epaper.fillScreen(TFT_WHITE);
      epaper.drawCentreString("MQTT Failed, retrying...", 400, 240, 4);
      epaper.update();
      
      delay(5000);
    }
  }
}

// 核心渲染逻辑：下载 1-bit RAW 并解析绘制
void downloadAndRender(String url) {
  Serial.println("[渲染] 启动图像拉取: " + url);
  
  epaper.fillScreen(TFT_WHITE);
  epaper.drawCentreString("Downloading image...", 400, 240, 4);
  epaper.update();
  
  HTTPClient http;

  // 设置超时，防止死锁
  http.setTimeout(10000);
  http.begin(url);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    int len = http.getSize();
    Serial.printf("[渲染] 下载字节数: %d 字节\n", len);

    WiFiClient *stream = http.getStreamPtr();

    // 清除屏幕缓冲区（白底），准备绘制真正的内容
    epaper.fillScreen(TFT_WHITE);

    int x = 0, y = 0;
    uint8_t buffer[256];

    // 800x480 的 1-bit 为 48,000 字节，按行绘制
    while (http.connected() && (y < 480)) {
      size_t available = stream->available();
      if (available) {
        int readLen = stream->readBytes(buffer, min(available, sizeof(buffer)));
        for (int i = 0; i < readLen; i++) {
          // 处理当前字节中的 8 个像素 (MSB First)
          for (int bit = 7; bit >= 0; bit--) {
            // 像素值为 1 表示背景色（白），0 表示前景色（黑）
            uint16_t color = (buffer[i] & (1 << bit)) ? TFT_WHITE : TFT_BLACK;

            if (x < 800 && y < 480) {
              epaper.drawPixel(x, y, color);
            }

            x++;
            if (x >= 800) {
              x = 0;
              y++;
              if (y >= 480)
                break;
            }
          }
          if (y >= 480)
            break;
        }
      }
      delay(1); // 防止喂狗复位
    }

    Serial.println("[渲染] 像素流绘制完毕，正在推送物理刷新...");
    epaper.update(); // 触发 UC8179 控制器刷新屏幕
    Serial.println("[渲染] 屏幕同步成功！");

  } else {
    Serial.printf("[错误] HTTP 请求失败, 错误代码: %d\n", httpCode);
    epaper.fillScreen(TFT_WHITE);
    epaper.drawCentreString("Download Failed!", 400, 220, 4);
    epaper.drawCentreString(String("HTTP Code: ") + String(httpCode), 400, 260, 4);
    epaper.update();
  }
  http.end();
}

void setup() {
  Serial.begin(115200);

  // 1. 初始化屏幕
  epaper.begin();
  epaper.setRotation(0);
  epaper.fillScreen(TFT_WHITE);
  epaper.setTextColor(TFT_BLACK, TFT_WHITE);
  epaper.drawCentreString("Initializing...", 400, 240, 4);
  epaper.update();

  // 2. 联网与 MQTT 准备
  setupWiFi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  // 保持连接
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 如果收到更新信号，触发渲染
  if (needUpdate) {
    needUpdate = false;
    downloadAndRender(downloadUrl);
  }

  delay(10);
}

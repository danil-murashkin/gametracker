#include <ESP8266WiFi.h>
#include <EEPROM.h>
#include <Adafruit_NeoPixel.h>

#define BUZZER 5
#define SHLED 4  //D2
//#define BLED 2

String ssid = "ANOMALY";
String pass = "defaultpass";
byte power = 10;
byte chan = 4;
char nut = 'N'; // Reaction to a bolt
bool red_light = false;
bool green_light = false;
bool blue_light = false;
bool blink_light = false;

const String protoID = "FT3";
const char ssidDiv = '_';

// Timers
unsigned long ChainTimeoutMin = 1;
unsigned long CooldownTimeoutMin = 60;
bool ChainTimeActive = false;
bool CooldownTimeActive = false;
unsigned long ChainTimeStart = 0;
unsigned long CooldownTimeStart = 0;
unsigned long blinklow = 3000;
unsigned long blinkhigh = 100;
unsigned long blinktime = 0;
bool blinkstate = false;

WiFiServer server(1337);  // Server for app commands
WiFiClient client;

bool LastClientPresence = false; // To check if client connected state has changed

Adafruit_NeoPixel ShLed = Adafruit_NeoPixel(1, SHLED, NEO_GRB + NEO_KHZ800);

//Pseudo-CLI interface variables
char inputChar = 13;        // Char for input char
String inputStr = "";       // String for input text
boolean newCommand = false; // Flag for detecting CR (Enter)
String prompt = ">";        // Command prompt. It is variable for ability to change prompt during operation

void setup() {
  WiFi.mode(WIFI_OFF);  // OTHERWISE AP WILL START AUTOMATICALLY HERE
  WiFi.persistent(false);
  WiFi.setPhyMode(WIFI_PHY_MODE_11B);
  //pinMode(BLED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  EEPROM.begin(4096);
  delay(100);

  // Read configuration here
  if (ReadString(0, 31) != "") {
    ReadAllConfig(); // Try to read ssid, and if it is not null, read all config from EEPROM
  } else {
    SaveAllConfig();  // Device is new, write default config
  }

  ShLed.begin();
  ShLed.show(); // Always call this function after strip.begin() otherwise it will init incorrectly
  ShLed.setPixelColor(0, 0, 0, 0);

  Serial.begin(115200);
  delay(100);
  Serial.println();

  /*
    //Test if prolonged sleep is configured
    if (EEPROM.read(66) == 73) {
    byte shr = EEPROM.read(67);
    if (shr > 0) {
      Serial.print(shr);
      Serial.println(" hours left to sleep. Decreasing counter and sleeping again");
      shr = shr - 1;
      EEPROM.write(67, shr);
      EEPROM.commit();
      delay(100);
      ESP.deepSleep(3600000000UL, WAKE_RF_DEFAULT); // Sleep for one hour
    } else {
      Serial.println("Sleep counter is zero - entering awake state");
      EEPROM.write(66, 61); // 'a' symbol - "awake" state
      EEPROM.commit();
    }
    }
  */

  StartAPScan();
  ShowConfig();
  Serial.println("");
  Serial.print(prompt);
}

void loop() {
  delay(20);
  if (client.connected()) {
    RemoteWifiCLI();
  } else {
    client = server.available();
  }
  if ((client) && (!LastClientPresence)) {
    Serial.println("Client connected.");
    LastClientPresence = true;
  } else if ((!client) && (LastClientPresence)) {
    Serial.println("Client disconnected");
    LastClientPresence = false;
  }
  TimersCheck();
  ScanCheck();
  LocalSerialCLI();
}

void StartAPScan() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ssid.c_str(), pass.c_str(), chan, false, 1);
  WiFi.setOutputPower(float(power));
  delay(100);
  IPAddress APIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(APIP);
  Serial.print("AP MAC: ");
  Serial.println(WiFi.macAddress());
  server.begin();
  WiFi.scanNetworks(true, false, chan, NULL);
}

void RestartAPScan(String newssid, byte newpower) {
  Serial.print("Restarting APScan with SSID ");
  Serial.print(newssid);
  Serial.print(" and power ");
  Serial.println(newpower);
  server.stop();
  WiFi.softAP(newssid.c_str(), pass.c_str(), chan, false, 1);
  WiFi.setOutputPower(float(newpower));
  delay(100);
  server.begin();
  WiFi.scanNetworks(true, false, chan, NULL);
}

void ScanCheck() {
  int n = WiFi.scanComplete();
  if (n >= 0) {
    for (int i = 0; i < n; i++) {
      if (WiFi.SSID(i).startsWith(protoID)) {
        // syntax: pIDcVVdd(ee)MM_ where pID is protocol ID, c is command symbol, VV - ML var number, dd - threshold RSSI(without -), ee - optional eachdBm (c == 'i' only),
        // MM - modifier with variable length (can be form M to MMMMMM, etc.), _ - next command indicator/divider
        String ucpStr = WiFi.SSID(i);
        ucpStr.remove(0, 3);
        bool isLast = false;  // Is it last command to parse
        do {
          char comc = ucpStr[0]; // Command char
          int eoci = ucpStr.indexOf(ssidDiv); // End of command index
          if (eoci == -1 || ucpStr.length() - eoci < 2) {
            eoci = ucpStr.length();
            isLast = true;
          }
          if (isUpperCase(comc)) {  // Special command
              if (comc == 'C' && !ChainTimeActive && !CooldownTimeActive) { // Clone anomaly (Mimicry protocol). Syntax: CppTTTT where pp is power (two digits), T - time in minutes (any qty)
                RestartAPScan(WiFi.SSID(i), ucpStr.substring(1, 3).toInt());
                ChainTimeoutMin = ucpStr.substring(3, eoci).toInt();
                ChainTimeActive = true;
                ChainTimeStart = 0;
              } else if (comc == 'B') {
                switch (nut) {
                  case 'E':
                    BlueLight();
                    ElectroSound();
                    NoLights();
                    break;
                  case 'C':
                    GreenLight();
                    ChembioSound();
                    NoLights();
                    break;
                  case 'G':
                    RedLight();
                    BlueLight();
                    GraviSound();
                    NoLights();
                    break;
                  case 'T':
                    RedLight();
                    ThermoSound();
                    NoLights();
                  default:
                    // statements
                    break;
                }
              } else if (comc == 'F') {
                FindMe();
              }
            }
          ucpStr.remove(0, eoci + 1);
        } while (!isLast);
      }
    }
    WiFi.scanDelete();
    WiFi.scanNetworks(true, false, chan);
  }
}

void TimersCheck() {
  if (ChainTimeActive) {
    if (ChainTimeStart == 0) ChainTimeStart = millis();
    if (ChainTimeoutMin * 60000 <= millis() - ChainTimeStart) {
      ChainTimeActive = false;
      ChainTimeStart = 0;
      RestartAPScan(ssid, power);
      CooldownTimeActive = true;
      CooldownTimeStart = 0;
    }
  }
  if (CooldownTimeActive) {
    if (CooldownTimeStart == 0) CooldownTimeStart = millis();
    if (CooldownTimeoutMin * 60000 <= millis() - CooldownTimeStart) {
      CooldownTimeActive = false;
      CooldownTimeStart = 0;
    }
  }
  if (blinkstate) {
    if ((millis() - blinktime) > blinkhigh) {
      blinktime = millis();
      blinkstate = false;
      if (blink_light) NoLights();
    }
  } else {
    if ((millis() - blinktime) > blinklow) {
      blinktime = millis();
      blinkstate = true;
      if (red_light) RedLight();
      if (green_light) GreenLight();
      if (blue_light) BlueLight();
    }
  }
}

void RemoteWifiCLI() {
  if (client.available()) {
    inputChar = client.read();
    if (inputChar == 13) {           // If Enter pressed
      if (inputStr.length() > 0) {   // There's something in input string, it shoud be new command
        newCommand = true;
      }
    }
    else
    {
      inputStr += inputChar; // In any other case incremently add chars from console to input string
    }
  }
  if (newCommand) {
    ProcessCommands();
    inputStr = "";        // Clear the input string for new input
    newCommand = false;   // Command processed, clear the flag
  }
}

void LocalSerialCLI() {
  if (Serial.available() > 0) {      // If there is a symbol in serial input
    inputChar = Serial.read();       // Read that symbol
    Serial.print(inputChar);         // Print it so it will be visible
    if (inputChar == 13) {           // If Enter pressed
      if (inputStr.length() > 0) {   // There's something in input string, it shoud be new command
        newCommand = true;
      }
      else                           // Nothing in input string, just make new line and print command prompt
      {
        Serial.println("");
        Serial.print(prompt);
      }
    }
    else
    {
      inputStr += inputChar; // In any other case incremently add chars from console to input string
    }
  }
  if (newCommand) {      // If there's new command
    Serial.println("");  // Make new line
    ProcessCommands();
    inputStr = "";        // Clear the input string for new input
    newCommand = false;   // Command processed, clear the flag
    Serial.print(prompt); //Display command prompt again
  }
}

void ProcessCommands() {
  if (inputStr.substring(0, 4) == "test") {
    inputStr.remove(0, 5);
    Serial.print("Received test value ");
    Serial.println(inputStr);
    int ss = inputStr.toInt();
    switch (ss) {
      case 1:
        GraviSound();
        break;
      case 2:
        ChembioSound();
        break;
      case 3:
        ElectroSound();
        break;
      case 4:
        ThermoSound();
        break;
      case 5:
        FindMe();
        break;
      default:
        // statements
        break;
    }
    /*} else if (inputStr.substring(0, 5) == "sleep") {
      inputStr.remove(0, 6);
      Serial.print("Sleeping for ");
      Serial.print(inputStr);
      Serial.println(" minutes");
      unsigned long smin = inputStr.toInt();
      if (smin < 60) {
        ESP.deepSleep(smin * 60000000UL, WAKE_RF_DEFAULT);
      } else {
        byte shr = smin / 60;
        unsigned long rsmin = smin % 60;
        if (rsmin == 0) {
          rsmin = 60;
          shr = shr - 1;
        }
        EEPROM.write(66, 73); // 's' symbol
        EEPROM.write(67, shr);
        EEPROM.commit();
        ESP.deepSleep(rsmin * 60000000UL, WAKE_RF_DEFAULT);
      }*/
  } else if (inputStr.substring(0, 4) == "info") {  // Display system uptime and other info
    Serial.print("System uptime: ");
    Serial.print(millis() / 60000);
    Serial.println(" minutes");
    //WiFi.printDiag(Serial);
    Serial.print("Core version: ");
    Serial.println(ESP.getCoreVersion());
    Serial.print("SDK version: ");
    Serial.println(ESP.getSdkVersion());
    Serial.print("Last reset reason: ");
    Serial.println(ESP.getResetReason());
    IPAddress APIP = WiFi.softAPIP();
    Serial.print("AP IP address: ");
    Serial.println(APIP);
    Serial.print("AP MAC: ");
    Serial.println(WiFi.macAddress());
    Serial.print("PHY mode:");
    Serial.println(WiFi.getPhyMode());
    Serial.print("Chip ID: ");
    Serial.println(ESP.getChipId());
    Serial.print("Free heap, bytes: ");
    Serial.println(ESP.getFreeHeap());
    Serial.print("RAM fragmentation, percents: ");
    Serial.println(ESP.getHeapFragmentation());
  } else if (inputStr.substring(0, 5) == "flush") {
    Serial.println("Flushing memory now!");
    EEClear(0, 4095); // Don't forget to adjust last value to EEPROM size - 1
  } else if (inputStr.substring(0, 4) == "save") {
    Serial.print("Saving current configuration...");
    SaveAllConfig();
    Serial.println("done.");
  } else if (inputStr.substring(0, 8) == "defaults") {
    Serial.print("Restoring defaults...");
    SetDefaults();
    Serial.println("done.");
  } else if (inputStr.substring(0, 4) == "show") {
    Serial.println("Current config:");
    ShowConfig();
  } else if (inputStr.substring(0, 6) == "reboot") {
    Serial.println("Reboot command received. System is going to reboot now!");
    ESP.restart();  // Hangs sometimes
  } else if (inputStr.substring(0, 4) == "ssid") {
    inputStr.remove(0, 5);
    Serial.println("ssid configured");
    ssid = inputStr;
    WriteString(ssid, 0, 31, true);
  } else if (inputStr.substring(0, 4) == "pass") {
    inputStr.remove(0, 5);
    Serial.println("pass configured");
    pass = inputStr;
    WriteString(pass, 32, 63, true);
  } else if (inputStr.substring(0, 5) == "power") {
    inputStr.remove(0, 6);
    Serial.println("power configured");
    power = byte(inputStr.toInt());
    WiFi.setOutputPower(float(power));
    EEPROM.write(64, power);
    EEPROM.commit();
  } else if (inputStr.substring(0, 4) == "chan") {
    inputStr.remove(0, 5);
    Serial.println("chan configured");
    chan = byte(inputStr.toInt());
    EEPROM.write(65, chan);
    EEPROM.commit();
  } else if (inputStr.substring(0, 3) == "nut") {
    inputStr.remove(0, 4);
    Serial.println("nut configured");
    nut = inputStr.charAt(0);
    EEPROM.write(68, nut);
    EEPROM.commit();
  } else if (inputStr.substring(0, 5) == "APPLY") {
    Serial.println("Applying changes if any");
    if (client.connected()) {
      client.println("-|dscn|");  // Disconnect warning
      delay(100);
      client.stop();
    }
    server.stop();
    StartAPScan();
  } else if (inputStr.substring(0, 9) == "RED_light") {
    RedLight();
    red_light = true;
  } else if (inputStr.substring(0, 11) == "GREEN_light") {
    GreenLight();
    green_light = true;
  } else if (inputStr.substring(0, 10) == "BLUE_light") {
    BlueLight();
    blue_light = true;
  } else if (inputStr.substring(0, 8) == "NO_light") {
    NoLights();
    red_light = false;
    green_light = false;
    blue_light = false;
    blink_light = false;
  } else if (inputStr.substring(0, 8) == "BLINK_ON") {
    blink_light = true;
  } else if (inputStr.substring(0, 9) == "BLINK_OFF") {
    blink_light = false;
  } else if (inputStr.substring(0, 7) == "confreq") {  // Configuration request
    Serial.println("Configuration request received");
    if (client) {
      Serial.println("Sending all config now");
      SendAllConfig();
    } else {
      Serial.println("Cannot send, no connection available");
    }
  } else {
    Serial.print("Command not recognized: ");
    Serial.println(inputStr);
  }
}

void SetDefaults() {
  ssid = "ANOMALY";
  pass = "defaultpass";
  power = 10;
  chan = 4;
  nut = 'N';
}

void SaveAllConfig() {
  WriteString(ssid, 0, 31, false);
  WriteString(pass, 32, 63, false);
  EEPROM.write(64, power);
  EEPROM.write(65, chan);
  EEPROM.write(68, nut);
  EEPROM.commit();
}

void ReadAllConfig() {
  ssid = ReadString(0, 31);
  pass = ReadString(32, 63);
  power = EEPROM.read(64);
  chan = EEPROM.read(65);
  nut = EEPROM.read(68);
}

void SendAllConfig() {
  int n = 1;
  SendStringParam("ssid", ssid, 31);
  delay(n);
  SendStringParam("pass", pass, 31);
  delay(n);
  SendByteParam("power", power, 0, 20);
  delay(n);
  SendByteParam("chan", chan, 1, 13);
  delay(n);
  SendStringParam("nut", String(nut), 1);
  delay(n);
  SendCmdParam("APPLY");
  delay(n);
  SendCmdParam("RED_light");
  delay(n);
  SendCmdParam("GREEN_light");
  delay(n);
  SendCmdParam("BLUE_light");
  delay(n);
  SendCmdParam("NO_light");
  delay(n);
  SendCmdParam("BLINK_ON");
  delay(n);
  SendCmdParam("BLINK_OFF");
}

void ShowConfig() {
  Serial.print("ssid = ");
  Serial.println(ssid);
  Serial.print("pass = ");
  Serial.println(pass);
  Serial.print("power = ");
  Serial.println(power);
  Serial.print("chan = ");
  Serial.println(chan);
  Serial.print("nut = ");
  Serial.println(nut);
}

void SendBoolParam(String pname, bool pval) {
  client.print("-|bool|");
  client.print(pname);
  client.print("|");
  if (pval) {
    client.println("1");
  } else {
    client.println("0");
  }
}

void SendByteParam(String pname, byte pval, byte lowlim, byte uplim) {
  client.print("-|byte|");
  client.print(pname);
  client.print("|");
  client.print(pval);
  client.print("|");
  client.print(lowlim);
  client.print("|");
  client.println(uplim);
}

void SendIntParam(String pname, int pval, int lowlim, int uplim) { // Probably can replace SendByteParam
  client.print("-|int|");
  client.print(pname);
  client.print("|");
  client.print(pval);
  client.print("|");
  client.print(lowlim);
  client.print("|");
  client.println(uplim);
}

void SendStringParam(String pname, String pval, int maxlength) {
  client.print("-|string|");
  client.print(pname);
  client.print("|");
  client.print(pval);
  client.print("|");
  client.println(maxlength);
}

void SendCmdParam(String cname) {
  client.print("-|cmd|");
  client.println(cname);
}

void SendUserMsg(String mtext) {
  client.print("-|umsg|");
  client.println(mtext);
}

void EEClear(int fromwhere, int howmuch) {
  for (int i = fromwhere; i <= (fromwhere + howmuch); i++) EEPROM.write(i, 255);
  EEPROM.commit();
}

String ReadString(int fromwhere, int tothere) {
  char a = 255;
  String strtoreturn = "";
  for (int i = fromwhere; i <= tothere; i++) {
    a = EEPROM.read(i);
    if ((isAlphaNumeric(a) || isPunct(a) || isWhitespace(a)) && byte(a) != 255) strtoreturn += a;
  }
  return strtoreturn;
}

void WriteString(String astr, int fromwhere, int tothere, bool commit) {
  for (int i = fromwhere; i <= tothere; i++) {
    if ((i - fromwhere) < astr.length()) {
      EEPROM.write(i, astr[i - fromwhere]);
    } else {
      EEPROM.write(i, 255);
    }
  }
  if (commit) EEPROM.commit();
}

unsigned int ReadUint(int upper, int bottom) {
  byte highbyte = EEPROM.read(upper);
  byte lowbyte = EEPROM.read(bottom);
  unsigned int result = word(highbyte, lowbyte);
  return result;
}

void WriteUint(unsigned int val, int upper, int bottom, bool commit) {
  EEPROM.write(upper, highByte(val));
  EEPROM.write(bottom, lowByte(val));
  if (commit) EEPROM.commit();
}

void RedLight() {
  ShLed.setPixelColor(0, 254, 0, 0);
  ShLed.show();
}

void GreenLight() {
  ShLed.setPixelColor(0, 0, 254, 0);
  ShLed.show();
}

void BlueLight() {
  ShLed.setPixelColor(0, 0, 0, 254);
  ShLed.show();
}

void WhiteLight() {
  ShLed.setPixelColor(0, 254, 254, 254);
  ShLed.show();
}

void NoLights() {
  ShLed.setPixelColor(0, 0, 0, 0);
  ShLed.show();
}

void GraviSound() {
  for (int i = 10; i > 0; i--) {
    for (int j = 0; j <= 10; j++) {
      digitalWrite(BUZZER, HIGH);
      delay(1);
      digitalWrite(BUZZER, LOW);
      delay(i);
    }
  }
  for (int i = 0; i < 11; i++) {
    for (int j = 0; j <= 10; j++) {
      digitalWrite(BUZZER, HIGH);
      delay(1);
      digitalWrite(BUZZER, LOW);
      delay(i);
    }
  }
}

void ElectroSound() {
  for (int s = 0; s < 10; s++) {
    digitalWrite(BUZZER, HIGH);
    delay(2);
    digitalWrite(BUZZER, LOW);
    delay(3);
    digitalWrite(BUZZER, HIGH);
    delay(2);
    digitalWrite(BUZZER, LOW);
    delay(100);
  }
}

void ThermoSound() {
  for (int s = 0; s < 500; s++) {
    digitalWrite(BUZZER, HIGH);
    delay(1);
    digitalWrite(BUZZER, LOW);
    delay(1);
  }
}

void ChembioSound() {
  for (int s = 0; s < 75; s++) {
    digitalWrite(BUZZER, HIGH);
    delay(7);
    digitalWrite(BUZZER, LOW);
    delay(7);
  }
}

void FindMe() {
  for (int s = 0; s < 100; s++) {
    WhiteLight();
    digitalWrite(BUZZER, HIGH);
    delay(100);
    NoLights();
    digitalWrite(BUZZER, LOW);
    delay(100);
  }
}

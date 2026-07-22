#include <ESP8266WiFi.h>
#include <EEPROM.h>
#include <Adafruit_NeoPixel.h>
#define PIEZOPIN 2  //D4 //Add 1MOhm resistor from this pin to GND
#define BUZZPIN 4   //D2 //Power buzzer from 3V
#define NEOPIN 5    //D1 //Power Neopixels from 5V
#define NEOQTY 3

unsigned int hits = 0;
unsigned int maxhits = 3;
String ssid = "MON-DEFAULT";
String pass = "monsterpass";
byte power = 10;

unsigned int HitAlarmTimeout = 80; // Buzz'n'red time after hit, milliseconds. No more hits will be detected within this time, so don't set too long.
unsigned int DieAlarmTimeout = 2000;  // Buzz time after death
unsigned int HitRegenTimeoutSec = 600; // Hit regeneration timeout, sec
unsigned int ResurrectTimeoutSec = 900; // Resurrection timeout, sec

//Timers
bool HitTimeActive = false;
unsigned long HitTimeStart = 0;
bool DieTimeActive = false;
unsigned long DieTimeStart = 0;
bool HitRegenTimeActive = false;
unsigned long HitRegenTimeStart = 0;
bool ResurrectTimeActive = false;
unsigned long ResurrectTimeStart = 0;

//Blinktimer, checking in TimersCheck(). Currently not used.
unsigned long blinklow = 300;
unsigned long blinkhigh = 100;
unsigned long blinktime = 0;
bool blinkstate = false;

WiFiServer server(1337);  // Server for app commands
//Clients quantity can be limited if needed. See WiFiTelnetToSerial example. Use client.stop method for undesired client.
WiFiClient client;

bool LastClientPresence = false; // To check if client connected state has changed

//Pseudo-CLI interface variables
char inputChar = 13;        // Char for input char
String inputStr = "";       // String for input text
boolean newCommand = false; // Flag for detecting CR (Enter)
String prompt = ">";        // Command prompt. It is variable for ability to change prompt during operation

Adafruit_NeoPixel strip = Adafruit_NeoPixel(NEOQTY, NEOPIN, NEO_GRB + NEO_KHZ800);
volatile bool hitDetected = false;

void ICACHE_RAM_ATTR IntCallback() {
  hitDetected = true;
}

void setup()
{
  WiFi.persistent(false);
  WiFi.mode(WIFI_OFF);

  pinMode(BUZZPIN, OUTPUT);
  digitalWrite(BUZZPIN, HIGH);

  EEPROM.begin(4096);
  delay(100);
  // Read configuration here
  if (ReadString(0, 31) != "") {
    ReadAllConfig(); // Try to read ssid, and if it is not null, read all config from EEPROM
  } else {
    SaveAllConfig();  // Device is new, write default config
  }

  strip.begin();
  strip.show(); // Always call this function after strip.begin() otherwise it will init incorrectly
  LightRGB(0, 0, 0); // Initialize all pixels to 'off'. This is required also

  Serial.begin(115200);
  Serial.println();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid.c_str(), pass.c_str(), 4, false, 1);
  WiFi.setOutputPower(float(power));
  IPAddress APIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(APIP);
  server.begin();

  BootIndication();
  if (hits >= maxhits) {
    Die();
  } else {
    attachInterrupt(digitalPinToInterrupt(PIEZOPIN), IntCallback, RISING);
  }
}

void loop()
{
  if (hitDetected && hits < maxhits) {
    detachInterrupt(digitalPinToInterrupt(PIEZOPIN));
    digitalWrite(BUZZPIN, LOW);
    LightRGB(255, 0, 0);
    hits++;
                                        .print("Hit ");
    Serial.println(hits);
    hitDetected = false;
    //delay(50);
    if (hits >= maxhits) {
      Serial.println("MAX HITS REACHED - MONSTER DEAD!");
      Die();
    } else {
      HitTimeActive = true;
      HitTimeStart = 0;
      HitRegenTimeActive = true;
      HitRegenTimeStart = 0;
    }
  }
  if (client.connected()) {
    RemoteWifiCLI();
  } else {
    client = server.available();
  }
  if ((client) && (!LastClientPresence)) {
    Serial.println("Client connected.");
    LastClientPresence = true;
    LightRGB(0, 0, 255);
  } else if ((!client) && (LastClientPresence)) {
    Serial.println("Client disconnected");
    LastClientPresence = false;
    if (hits >= maxhits) {
      LightRGB(255, 0, 0);
    } else {
      LightRGB(0, 0, 0);
    }
  }
  TimersCheck();
  LocalSerialCLI();
  delay(20);
}

void Die() {
  WriteUint(hits, 67, 68, true);
  LightRGB(255, 0, 0);
  digitalWrite(BUZZPIN, LOW);
  DieTimeActive = true;
  DieTimeStart = 0;
  HitRegenTimeActive = false; // No hit regeneration while dead
  HitRegenTimeStart = 0;
  ResurrectTimeActive = true;
  ResurrectTimeStart = 0;
  //WiFi.setOutputPower(0);
}

void Resurrect() {
  Serial.println("Resurrection!");
  hits = 0;
  WriteUint(hits, 67, 68, true);
  digitalWrite(BUZZPIN, LOW);
  LightRGB(0, 255, 0);
  delay(200);
  digitalWrite(BUZZPIN, HIGH);
  LightRGB(0, 0, 0);
  attachInterrupt(digitalPinToInterrupt(PIEZOPIN), IntCallback, RISING);
  //WiFi.setOutputPower(float(power));
}

void TimersCheck() {
  if (HitTimeActive) {
    if (HitTimeStart == 0) HitTimeStart = millis();
    if (HitAlarmTimeout <= (millis() - HitTimeStart)) {
      HitTimeActive = false;
      HitTimeStart = 0;
      WriteUint(hits, 67, 68, true);
      attachInterrupt(digitalPinToInterrupt(PIEZOPIN), IntCallback, RISING);
      digitalWrite(BUZZPIN, HIGH);
      LightRGB(0, 0, 0); 
    }
  }
  if (DieTimeActive) {
    if (DieTimeStart == 0) DieTimeStart = millis();
    if (DieAlarmTimeout < (millis() - DieTimeStart)) {
      DieTimeActive = false;
      DieTimeStart = 0;
      digitalWrite(BUZZPIN, HIGH); // Turn off only sound, red light stays on
    }
  }
  if (HitRegenTimeActive) {
    if (HitRegenTimeStart == 0) HitRegenTimeStart = millis();
    if (HitRegenTimeoutSec * 1000 < (millis() - HitRegenTimeStart)) {
      HitRegenTimeActive = false;
      HitRegenTimeStart = 0;
      if (hits > 0) {
        hits--;
        WriteUint(hits, 67, 68, true);
        Serial.println("Hit regenerated");
      }
      if (hits > 0) {
        HitRegenTimeActive = true;
        Serial.println("Hit regeneration timer restarted");
      }
    }
  }
  if (ResurrectTimeActive) {
    if (ResurrectTimeStart == 0) ResurrectTimeStart = millis();
    if (ResurrectTimeoutSec * 1000 < (millis() - ResurrectTimeStart)) {
      ResurrectTimeActive = false;
      ResurrectTimeStart = 0;
      if (hits >= maxhits) Resurrect();
    }
  }
  if (blinkstate) {
    if ((millis() - blinktime) > blinkhigh) {
      blinktime = millis();
      blinkstate = false;
    }
  } else {
    if ((millis() - blinktime) > blinklow) {
      blinktime = millis();
      blinkstate = true;
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
  } else if (inputStr.substring(0, 4) == "info") {  // Display system uptime and other info
    Serial.print("System uptime: ");
    Serial.print(millis() / 60000);
    Serial.println(" minutes");
    ShowConfig();
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
  } else if (inputStr.substring(0, 4) == "hits") {
    Serial.println("hits value set");
    inputStr.remove(0, 5);
    hits = inputStr.toInt();
    WriteUint(hits, 67, 68, false);
  } else if (inputStr.substring(0, 7) == "maxhits") {
    inputStr.remove(0, 8);
    Serial.println("Max hits configured");
    maxhits = inputStr.toInt();
    WriteUint(maxhits, 65, 66, true);
  } else if (inputStr.substring(0, 14) == "hit_regen_time") {
    inputStr.remove(0, 15);
    Serial.println("Hit regeneration time configured");
    HitRegenTimeoutSec = inputStr.toInt();
    WriteUint(HitRegenTimeoutSec, 69, 70, true);
  } else if (inputStr.substring(0, 14) == "resurrect_time") {
    inputStr.remove(0, 15);
    Serial.println("Resurrection time configured");
    ResurrectTimeoutSec = inputStr.toInt();
    WriteUint(ResurrectTimeoutSec, 71, 72, true);
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
    EEPROM.write(64, power);
    EEPROM.commit();
  } else if (inputStr.substring(0, 4) == "LIVE") {
    Serial.println("Getting alive!");
    Resurrect();
  } else if (inputStr.substring(0, 5) == "APPLY") {
    Serial.println("Applying changes if any");
    if (client.connected()) {
      client.println("-|dscn|");  // Disconnect warning
      delay(100);
      client.stop();
    }
    server.stop();
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ssid.c_str(), pass.c_str());
    /*if (alive) {
      WiFi.setOutputPower(float(power));
    } else {
      WiFi.setOutputPower(0);
    }*/
    server.begin();
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
  hits = 0;
  maxhits = 3;
  HitRegenTimeoutSec = 600;
  ResurrectTimeoutSec = 900;
  ssid = "MON-DEFAULT";
  pass = "monsterpass";
  power = 10;
}

void SaveAllConfig() {
  WriteString(ssid, 0, 31, false);
  WriteString(pass, 32, 63, false);
  EEPROM.write(64, power);
  WriteUint(maxhits, 65, 66, false);
  WriteUint(hits, 67, 68, false);
  WriteUint(HitRegenTimeoutSec, 69, 70, false); // Not using memory areas used by Power Armor to maintain memory compatibility
  WriteUint(ResurrectTimeoutSec, 71, 72, false);
  EEPROM.commit();
}

void ReadAllConfig() {
  ssid = ReadString(0, 31);
  pass = ReadString(32, 63);
  power = EEPROM.read(64);
  maxhits = ReadUint(65, 66);
  hits = ReadUint(67, 68);
  HitRegenTimeoutSec = ReadUint(69, 70);
  ResurrectTimeoutSec = ReadUint(71, 72);
}

void SendAllConfig() {
  int n = 1;
  SendIntParam("maxhits", maxhits, 1, 1000);
  delay(n);
  SendIntParam("hit_regen_time", HitRegenTimeoutSec, 1, 1000000);
  delay(n);
  SendIntParam("resurrect_time", ResurrectTimeoutSec, 1, 1000000);
  delay(n);
  SendStringParam("ssid", ssid, 31);
  delay(n);
  SendStringParam("pass", pass, 31);
  delay(n);
  SendByteParam("power", power, 0, 20);
  delay(n);
  SendCmdParam("APPLY");
  delay(n);
  SendCmdParam("NO_BEEP");
  delay(n);
  SendCmdParam("LIVE");
}

void ShowConfig() {
  Serial.print("hits = ");
  Serial.println(hits);
  Serial.print("maxhits = ");
  Serial.println(maxhits);
  Serial.print("HitRegenTimeoutSec = ");
  Serial.println(HitRegenTimeoutSec);
  Serial.print("ResurrectTimeoutSec = ");
  Serial.println(ResurrectTimeoutSec);
  Serial.print("ssid = ");
  Serial.println(ssid);
  Serial.print("pass = ");
  Serial.println(pass);
  Serial.print("power = ");
  Serial.println(power);
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


void LightRGB(byte rv, byte gv, byte bv) {
  for (int i = 0; i < NEOQTY; i++) {
    strip.setPixelColor(i, rv, gv, bv);
  }
  strip.show();
}

void BootIndication() {
  LightRGB(0, 255, 0);
  for (int i = 10; i > 0; i--) {
    for (int j = 0; j <= 10; j++) {
      digitalWrite(BUZZPIN, LOW);
      delay(1);
      digitalWrite(BUZZPIN, HIGH);
      delay(i);
    }
  }
  LightRGB(0, 0, 0);
}

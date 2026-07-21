#include <ESP8266WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <PN532_HSU.h>
#include <PN532.h>
#include <NfcAdapter.h>
#include <ml-ev5.h>
#include <EEPROM.h>
#include <utf8rus.h>
#include <Fonts/Ubuntu6pt8b.h>
#define RUSFNT &Ubuntu6pt8b
ADC_MODE(ADC_VCC);

#define EEPROMSIZE 2048
#define BUTTON 12
#define BUZZER 13
#define OLED_RESET 0

#define DICTSIZE 27 // Tag compression dictionary size
const String Dict[DICTSIZE] = { "PROTO:", "NAME:", "TYPE:", "TEXT:", "USES:", "EFFECTS:", "REVIVE:", "RESET:", "SPLASH:", "SPLASHSSID:", "SPLASHPOW:",
                                "SCAN:", "EFFECTS:", "TAR", "ADD", "SET", "EID", "REM", "REP", "INT", "AFT", "TAG", "CON", "fRND", "fQTY", "fDEL", "  "
                              };
const String EncKeyStr = "a2oq758v9aotys4ao38yvnba9o283r232xo93mv"; // Tag encryption key. Should be longer than 15 symbols
byte LastTagUID[16];  // Currently there is no information about tag UIDs longer than 8 bytes, so 16 is just overinsurance
unsigned int LastTagUIDsize = 0;

Adafruit_SSD1306 display(OLED_RESET);

unsigned long rs_millis = 0;  // Running string millis
int rs_offset = 0;  // Running string offset

PN532_HSU pn532hsu(Serial);
PN532 pn532(pn532hsu);
NfcAdapter nfc = NfcAdapter(pn532hsu);

const int ScanStackSize = 10;
ScanEntry ScanStack[ScanStackSize];

// External data field dividers
const char ssidDiv = '_';
const char headValDiv = ':';
const char outEffDiv = char(10);
const char inEffDiv = ' ';

String NFCStr = "";

// Power voltage (on Wemos D1 mini ADC shows about 300 mV lower than actual voltage)
int mVolt = 2900;
const int lowVolt = 2400;

const unsigned char bombshell [] PROGMEM = {
  0x00, 0x00, 0x00, 0x7e, 0x00, 0x00, 0x7f, 0x00, 0x00, 0x7f, 0x80, 0x00, 0x7f, 0xc0, 0x00, 0x7f,
  0xe0, 0x00, 0x7f, 0xf0, 0x00, 0x3f, 0xf0, 0x00, 0x1f, 0xf0, 0x00, 0x0f, 0xf3, 0x80, 0x07, 0xff,
  0xc0, 0x03, 0xff, 0xe0, 0x00, 0x3f, 0xf0, 0x00, 0x39, 0xe0, 0x00, 0x78, 0x80, 0x00, 0x7c, 0x00,
  0x00, 0x7e, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x1c, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00
};

// Button
bool buttonWasPressed = false;

// Timers
unsigned long LongClickTimeout = 700;
unsigned long ShortClickTimeout = 200;
unsigned long TempIndTimeout = 3000;
unsigned long TagTimeout = 5000;
unsigned long SplashTimeout = 500;  // Wifi splash time with ssid to command external device
unsigned long ScanTimeout = 200;
bool LongClickTimeActive = false;
unsigned long LongClickTimeStart = 0;
bool ShortClickTimeActive = false;
unsigned long ShortClickTimeStart = 0;
bool TempIndTimeActive = false;
unsigned long TempIndTimeStart = 0;
bool TagTimeActive = false;
unsigned long TagTimeStart = 0;
bool SplashTimeActive = false;
unsigned long SplashTimeStart = 0;
bool ScanTimeActive = true;
unsigned long ScanTimeStart = 0;
unsigned long blinklow = 300;
unsigned long blinkhigh = 300;
unsigned long blinktime = 0;
bool blinkstate = false;
unsigned long LBblinklow = 2711; // Low battery blinking indication. Using primes for timeouts for not intersecting too much with regular indication
unsigned long LBblinkhigh = 1193;
unsigned long LBblinktime = 0;
bool LBblinkstate = false;

const String protoID = "BZ1"; // Protocol version and/or command set identifier, 3 symbols
byte Charges = 2;
int LongClickCount = 0;

int PASignal = -100;  // Highest powerarmor signal level
int PAScale = 0;

void setup() {
  WiFi.mode(WIFI_OFF);
  WiFi.persistent(false);
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(BUZZER, OUTPUT);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);  // initialize with the I2C addr 0x3C (for the 64x48)
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(14, 14);
  display.print("PLEASE");
  display.setCursor(10, 26);
  display.print("STANDBY");
  display.display();
  BootSound();

  Serial.begin(115200);
  //nfc.begin();
  pn532.powerDown(16, 0);

  NFCStr.reserve(720);

  EEPROM.begin(EEPROMSIZE);
  delay(100);
  Charges = EEPROM.read(0);
  if (Charges > 6) Charges = 6;
  ScanSTA();
}

void loop() {
  delay(30);
  mVolt = ESP.getVcc();
  ScanCheck();
  ButtonCheck();
  TimersCheck();
  Indicate();
}

void ScanCheck() {
  int n = WiFi.scanComplete();
  if (n >= 0) {
    for (int i = 0; i < n; i++) {
      if (WiFi.SSID(i) == "PA-CONFIG-DEFAULT" || WiFi.SSID(i) == "PA-DEFAULT" || WiFi.SSID(i) == "FT3a27780") {
        bool notInStack = true;
        for (int j = 0; j < ScanStackSize; j++) {  // Check if this network is in ScanStack
          if (WiFi.BSSIDstr(i) == ScanStack[j].bssid) {
            notInStack = false;
            break;
          }
        }
        if (notInStack) {
          for (int j = 0; j < ScanStackSize; j++) {  // Add it to the first empty place of ScanStack
            if (ScanStack[j].bssid == "") {
              ScanStack[j].ssid = WiFi.SSID(i);
              ScanStack[j].bssid = WiFi.BSSIDstr(i);
              ScanStack[j].rssi = WiFi.RSSI(i);
              break;
            }
          }
        }
      }
    }
    WiFi.scanDelete();
    WiFi.scanNetworks(true, false, 4);
  }
}

void ProcessScanResult(String ssidStr, int rssiInt) {
  if (rssiInt > PASignal) {
    PASignal = rssiInt;
    PAScale = map(PASignal, -100, -32, 0, 63);
  }
}

void BootSound() {
  for (int i = 10; i > 0; i--) {
    for (int j = 0; j <= 10; j++) {
      digitalWrite(BUZZER, HIGH);
      delay(2);
      digitalWrite(BUZZER, LOW);
      delay(i);
    }
  }
}

void Indicate() {
  display.clearDisplay();
  if (LBblinkstate && mVolt < lowVolt) {
    display.setFont(RUSFNT);
    display.setCursor(0, 22);
    display.print(utf8rus("ЗАМЕНИТЕ"));
    display.setCursor(5, 34);
    display.print(utf8rus("БАТАРЕИ"));
    display.display();
    return;
  }
  if (TagTimeActive) {
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    display.println(utf8rus("заряжание"));
    display.println(utf8rus("приложите"));
    display.print(utf8rus("метку "));
    if (TagTimeStart == 0) TagTimeStart = millis();
    display.println((TagTimeStart + TagTimeout - millis()) / 1000);
    display.display();
    return;
  }
  if (PASignal > -100) {
    display.fillRect(0, 44, PAScale, 3, WHITE);
  }
  if (Charges > 0) {
    int x = 0;
    int y = 0;
    for (int i = 0; i < Charges; i++) {
      display.drawBitmap(x, y, bombshell, 20, 20, 1);
      x = x + 21;
      if (x == 63) {
        x = 0;
        y = 21;
      }
    }
  } else {
    display.setFont(RUSFNT);
    display.setCursor(0, 22);
    display.print(utf8rus("ЗАРЯДИТЕ"));
    display.setCursor(0, 34);
    display.print(utf8rus("СНАРЯДЫ"));
  }
  display.display();
}

void SplashSSID(String spssid, String powerStr) {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(spssid.c_str(), "nooneknows", 4, false, 0);
  WiFi.setOutputPower(float(powerStr.toInt()));
  WiFi.setPhyMode(WIFI_PHY_MODE_11B);
  WiFi.scanNetworks(true, false, 4);
  SplashTimeStart = 0;
  SplashTimeActive = true;
}

void ScanSTA() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  WiFi.setPhyMode(WIFI_PHY_MODE_11B);
  WiFi.scanNetworks(true, false, 4);
}

void ButtonCheck() {
  int btnState = digitalRead(BUTTON);
  if (btnState == LOW && !buttonWasPressed) { //press
    delay(31);
    if (digitalRead(BUTTON) == HIGH) return;  // Debounce protection
    buttonWasPressed = true;
    LongClickTimeStart = 0;
    LongClickTimeActive = true;
    if (ShortClickTimeActive) ShortClickTimeStart = 0;
  } else if (btnState == HIGH && buttonWasPressed) {  //release
    buttonWasPressed = false;
    LongClickCount = 0;
    if (!LongClickTimeActive) { // long click detected
      //LongClickTimeStart = 0;
      //LongClickTimeActive = false;
      // Do something on long click
    } else {
      if (ShortClickTimeActive) { // double click detected
        ShortClickTimeActive = false; // stop the timer so single click will not be detected in
        ShortClickTimeStart = 0;
        LongClickTimeActive = false;
        LongClickTimeStart = 0;
        TagTimeActive = true;
        TagTimeStart = 0;
        nfc.begin();
      } else {
        ShortClickTimeActive = true;
        ShortClickTimeStart = 0;
      }
    }
  }
}

void TimersCheck() {
  if (LongClickTimeActive) {
    if (LongClickTimeStart == 0) LongClickTimeStart = millis();
    if (LongClickTimeout < millis() - LongClickTimeStart) {
      LongClickTimeStart = 0;
      LongClickTimeActive = false;
      if (Charges > 0) {
        if (LongClickCount >= 2) {
          LongClickCount = 0;
          display.clearDisplay();
          display.setFont(RUSFNT);
          display.setCursor(12, 28);
          display.print(utf8rus("ОГОНЬ!!!"));
          display.display();
          SplashSSID("EMPBOMB-B", "23");
          Charges--;
          EEPROM.write(0, Charges);
          EEPROM.commit();
          digitalWrite(BUZZER, HIGH);
          delay(1000);
          digitalWrite(BUZZER, LOW);
        } else {
          LongClickTimeActive = true;
          LongClickCount++;
          digitalWrite(BUZZER, HIGH);
          delay(200);
          digitalWrite(BUZZER, LOW);
        }
      }
    }
  }
  if (ScanTimeActive) {
    if (ScanTimeStart == 0) ScanTimeStart = millis();
    if (ScanTimeout < millis() - ScanTimeStart) {
      ScanTimeStart = millis();
      PASignal = -100;
      PAScale = 0;
      for (int i = 0; i < ScanStackSize; i++) { // Process and clear ScanStack
        ProcessScanResult(ScanStack[i].ssid, ScanStack[i].rssi);
        ScanStack[i].bssid = "";
        ScanStack[i].ssid = "";
        ScanStack[i].rssi = -100;
      }
    }
  }
  if (ShortClickTimeActive) {
    if (ShortClickTimeStart == 0) ShortClickTimeStart = millis();
    if (ShortClickTimeout < millis() - ShortClickTimeStart) {
      ShortClickTimeActive = false;
      ShortClickTimeStart = 0;
      if (!buttonWasPressed) {  // Short click detected
        LongClickTimeActive = false;
        LongClickTimeStart = 0;
        // Do something on short click
      }
    }
  }
  if (TagTimeActive) {
    if (TagTimeStart == 0) TagTimeStart = millis();
    if (TagTimeout < millis() - TagTimeStart) {
      TagTimeStart = 0;
      TagTimeActive = false;
      ConsumeTag();
    }
  }
  if (SplashTimeActive) {
    if (SplashTimeStart == 0) SplashTimeStart = millis();
    if (SplashTimeout < millis() - SplashTimeStart) {
      SplashTimeStart = 0;
      SplashTimeActive = false;
      ScanSTA();
      SplashTimeStart = 0;
      SplashTimeActive = false;
    }
  }
  if (blinkstate) {
    if ((millis() - blinktime) > blinkhigh) {
      blinktime = millis();
      blinkstate = false;
      digitalWrite(BUZZER, LOW);
    }
  } else {
    if ((millis() - blinktime) > blinklow) {
      blinktime = millis();
      blinkstate = true;
    }
  }
  if (LBblinkstate) {
    if ((millis() - LBblinktime) > LBblinkhigh) {
      LBblinktime = millis();
      LBblinkstate = false;
    }
  } else {
    if ((millis() - LBblinktime) > LBblinklow) {
      LBblinktime = millis();
      LBblinkstate = true;
    }
  }
}

void ConsumeTag() {
  rs_offset = 0;
  String consumeMessage = "ОШИБКА";
  if (ReadNFCStr()) {
    consumeMessage = "СНАРЯДОВ      НЕТ";
    NFCStr.replace(String(char(13)), ""); // Remove CRs if any, only LFs should remain
    if (GetTagVal("PROTO") == protoID) {
      int usesLeft = GetTagValDef("USES", "1").toInt();
      if (GetTagVal("TYPE") == "EMP" && usesLeft > 0) {
        int chargesToLoad = min(usesLeft, 6 - Charges);
        ModTagVal("USES", String(usesLeft - chargesToLoad), true);
        if (WriteNFCStr()) {
          Charges = Charges + chargesToLoad;
          String ending = "";
          if (chargesToLoad > 1 && chargesToLoad < 5) {
            ending = "А";
          } else if (chargesToLoad > 4) {
            ending = "ОВ";
          }
          consumeMessage = "ЗАРЯЖЕНО        " + String(chargesToLoad) + "                  СНАРЯД" + ending;
          EEPROM.write(0, Charges);
          EEPROM.commit();
        } else {
          consumeMessage = "ОШИБКА";
        }
      } else {
        consumeMessage = "СНАРЯДОВ      НЕТ";
      }
    }
  }
  pn532.powerDown(16, 0);
  display.clearDisplay();
  display.setFont(RUSFNT);
  display.setCursor(0, 10);
  display.print(utf8rus(consumeMessage));
  display.display();
  delay(2000);
}

bool ReadNFCStr() {
  NFCStr = "";
  bool success = false;
  if (nfc.tagPresent()) {
    NfcTag tag = nfc.read();
    unsigned int uidLength = tag.getUidLength();
    byte uid[uidLength];
    tag.getUid(uid, uidLength);
    LastTagUIDsize = uidLength;
    for (int u = 0; u < uidLength; u++) {
      LastTagUID[u] = uid[u];
    }
    if (tag.hasNdefMessage()) {
      NdefMessage msg = tag.getNdefMessage();
      int recordCount = msg.getRecordCount();
      if (recordCount == 0) return false;
      NdefRecord record = msg.getRecord(0);
      int payloadLength = record.getPayloadLength();
      byte payload[payloadLength];
      record.getPayload(payload);
      // Decryption
      int l = 0;   // Preparing key
      byte EncKeyArr[EncKeyStr.length()];
      for (int k = 0; k < EncKeyStr.length(); k++) {
        EncKeyArr[k] = ((uid[l] + k + 4) ^ byte(EncKeyStr[k]));
        l++;
        if (l > uidLength - 1) l = 0;
      }
      int j = 0;  // Decrypting
      for (int c = 0; c < payloadLength; c++) {
        byte decByte = (payload[c] ^ (EncKeyArr[j]));
        if (IsNUchar(decByte)) {
          NFCStr += Dict[NUcharToOrder(decByte)];
        } else {
          NFCStr += char(decByte);
        }
        j++;
        if (j > EncKeyStr.length() - 1) j = 0;
      }
      if (NFCStr.length() > 0) success = true;
    }
  }
  return success;
}

bool WriteNFCStr() {
  if (nfc.tagPresent()) {
    String inStr = NFCStr;  // To protect original NFCStr from changes by .replace() method
    // Compression
    for (int i = 0; i < DICTSIZE; i++) {
      inStr.replace(Dict[i], String(char(OrderToNUchar(i))));
    }
    // Encryption
    int l = 0;   // Preparing key
    byte EncKeyArr[EncKeyStr.length()];
    for (int k = 0; k < EncKeyStr.length(); k++) {
      EncKeyArr[k] = ((LastTagUID[l] + k + 4) ^ byte(EncKeyStr[k]));
      l++;
      if (l > LastTagUIDsize - 1) l = 0;
    }
    int encLength = inStr.length(); // Encrypting
    byte encArr[encLength];
    int j = 0;
    for (int i = 0; i < inStr.length(); i++) {
      encArr[i] = byte(inStr[i]) ^ byte(EncKeyArr[j]);
      j++;
      if (j > EncKeyStr.length() - 1) j = 0;
    }
    // Writing
    NdefMessage message = NdefMessage();
    message.addMimeMediaRecord("unknown", (byte*)encArr, encLength);
    bool success = nfc.write(message);
    return success;
  } else {
    return false;
  }
}

void AddTagKeyVal(const String& keyStr, const String& valStr) { // CHECK HERE
  String hstr = NFCStr.substring(0, NFCStr.indexOf("EFFECTS:")); // Extracting header string
  String estr = NFCStr.substring(NFCStr.indexOf("EFFECTS:")); // Extracting effects string with key "EFFECTS"
  NFCStr = hstr + keyStr + headValDiv + valStr + outEffDiv + estr;
}

String GetTagVal(const String& keyStr) {
  String searchStr = keyStr + headValDiv;
  int kidx = NFCStr.indexOf(searchStr);
  int eidx = NFCStr.indexOf(outEffDiv, kidx);
  if (eidx == -1) eidx = NFCStr.length();
  if (kidx > -1) {
    return NFCStr.substring(kidx + searchStr.length(), eidx);
  } else {
    return "";
  }
}

String GetTagValDef(const String& keyStr, const String& defStr) {
  String searchStr = keyStr + headValDiv;
  int kidx = NFCStr.indexOf(searchStr);
  int eidx = NFCStr.indexOf(outEffDiv, kidx);
  if (eidx == -1) eidx = NFCStr.length();
  if (kidx > -1) {
    String retStr = NFCStr.substring(kidx + searchStr.length(), eidx);
    if (retStr != "") return retStr;
    return defStr;
  } else {
    return defStr;
  }
}

bool TagKeyExists(const String& keyStr) {
  String searchStr = keyStr + headValDiv;
  if (NFCStr.indexOf(searchStr) == -1) {
    return false;
  } else {
    return true;
  }
}

void ModTagVal(const String& keyStr, const String& valStr, bool addFlag) {
  String repStr = keyStr;
  repStr += headValDiv;
  repStr += valStr;
  if (TagKeyExists(keyStr)) {
    String oldValStr = GetTagVal(keyStr);
    String searchStr = keyStr;
    searchStr += headValDiv;
    searchStr += oldValStr;
    NFCStr.replace(searchStr, repStr);
  } else {
    if (addFlag) {
      NFCStr = repStr + NFCStr; // Ineffective for memory! Should be rare case though, but rethink it if possible.
    } else {
      return;
    }
  }
}

String GetTagValFrom(const String& sourceStr, const String& keyStr) {
  String searchStr = keyStr + headValDiv;
  int kidx = sourceStr.indexOf(searchStr);
  int eidx = sourceStr.indexOf(outEffDiv, kidx);
  if (eidx == -1) eidx = sourceStr.length();
  if (kidx > -1) {
    return sourceStr.substring(kidx + searchStr.length(), eidx);
  } else {
    return "";
  }
}

byte OrderToNUchar(byte ord) {
  byte res = ord + 1;
  if (res > 8) res = res + 2;
  if (res > 12) res++;
  if (res > 26) res++;
  return res;
}

byte NUcharToOrder(byte nu) {
  byte res = nu - 1;
  if (res > 26) res--;
  if (res > 12) res--;
  if (res > 8) res = res - 2;
  return res;
}

bool IsNUchar(byte ch) {
  if (ch < 32 && ch != 0 && ch != 27 && ch != 13 && ch != 9 && ch != 10) {
    return true;
  } else {
    return false;
  }
}

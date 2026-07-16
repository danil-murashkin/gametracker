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

#define STRENGTH 1
#define PERCEPTION 2
#define ENDURANCE 3
#define CHARISMA 4
#define INTELLECT 5
#define AGILITY 6
#define LUCK 7
#define MODSTRENGTH 8
#define MODPERCEPTION 9
#define MODENDURANCE 10
#define MODCHARISMA 11
#define MODINTELLECT 12
#define MODAGILITY 13
#define MODLUCK 14

#define LIFE 15
#define MAXLIFE 16
#define FOOD 17
#define WATER 18
#define FOODPERCYC 19
#define WATERPERCYC 20
#define RADRESIST 21
#define CHEMBIORESIST 22
#define PHYSICALRESIST 23
#define RADDOSE 24
#define RADNOW 25
#define CHEMBIO 26
#define PHYSICAL 27
#define PERK 28
#define PLAYERID 29
#define STARTFOOD 30
#define STARTWATER 31
#define RACE 32 // 0 - human, 1 - ghoul, 2 - supermutant
#define AMBIENTTEMP 33
#define MODTEMP 34
#define PLAYERTEMP 35
#define SHELTER 36
#define ARMORSTATE 37
#define MAXARMOR 38
#define ARADRESIST 39
#define APHYSRESIST 40
#define ACHEMBIORESIST 41
#define ATHERMOINSULATION 42

#define DICTSIZE 27 // Tag compression dictionary size
const String Dict[DICTSIZE] = { "PROTO:", "NAME:", "TYPE:", "TEXT:", "USES:", "EFFECTS:", "REVIVE:", "RESET:", "SPLASH:", "SPLASHSSID:", "SPLASHPOW:",
                                "SCAN:", "EFFECTS:", "TAR", "ADD", "SET", "EID", "REM", "REP", "INT", "AFT", "TAG", "CON", "fRND", "fQTY", "fDEL", "  "
                              };
const String EncKeyStr = "a2oq758v9aotys4ao38yvnba9o283r232xo93mv"; // Tag encryption key. Should be longer than 15 symbols
byte LastTagUID[16];  // Currently there is no information about tag UIDs longer than 8 bytes, so 16 is just overinsurance
unsigned int LastTagUIDsize = 0;

Adafruit_SSD1306 display(OLED_RESET);
char IndicationMode = 'A';  // A - VaultBoy head, B - SPECIAL, C - water and food, D - resistances, M - temporary message, P - perk status,  R - revival mode, T - countdown timer for NFC routines
char PrevIndMode = 'A'; // For returning to previous screen after M and T modes. Also for detecting perk activation
String TempMessageStr = ""; // For displaying temporary messages with IndicationMode == 'M'
String TempTextStr = "";
bool RadPflag = false;  // Perception flags. Will be raised if perception allows early detection. Then flags should be processed in Indicate()
bool ChemPflag = false;
bool PhyPflag = false;
bool WasAliveFlag = true;
bool MeatTaken = false; // For cannibals not to take more than one meat unit
int ThermalState = 0; // 0 - normal, -1 - below zero, -2 - freezing, +1 - above zero, +2 - overheating

unsigned long rs_millis = 0;  // Running string millis
int rs_offset = 0;  // Running string offset

PN532_HSU pn532hsu(Serial);
PN532 pn532(pn532hsu);
NfcAdapter nfc = NfcAdapter(pn532hsu);

String NFCStr = "";
String DeathCauseStr = "";

//For image conversion use this tool https://javl.github.io/image2cpp/
const unsigned char vbhead1 [] PROGMEM = {
  0x00, 0x00, 0x03, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x30, 0x00, 0x00, 0x00, 0x00, 0x18, 0x0e,
  0x00, 0x00, 0x06, 0x03, 0xf0, 0x01, 0x80, 0x00, 0x0a, 0x0c, 0x00, 0x00, 0x40, 0x00, 0x12, 0x18,
  0x00, 0x00, 0x60, 0x00, 0x32, 0x30, 0x00, 0x00, 0x20, 0x00, 0x23, 0xc0, 0x00, 0x00, 0x10, 0x00,
  0x20, 0x00, 0x00, 0x00, 0x18, 0x00, 0x30, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x30, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x80, 0x60, 0x00,
  0x00, 0x00, 0x00, 0x80, 0x40, 0x0c, 0x00, 0x20, 0x00, 0x80, 0x40, 0x1c, 0x00, 0x70, 0x00, 0xc0,
  0x60, 0x00, 0x00, 0x70, 0x00, 0xc0, 0x20, 0x00, 0x00, 0x18, 0x00, 0xc0, 0x30, 0x00, 0x00, 0x08,
  0x00, 0xc0, 0x10, 0x30, 0x00, 0x00, 0x00, 0xc0, 0x30, 0x30, 0x00, 0x00, 0x00, 0xc0, 0x20, 0x30,
  0x40, 0xc0, 0x00, 0xc0, 0x20, 0x30, 0x80, 0xc0, 0x00, 0x80, 0x60, 0x21, 0x80, 0xc0, 0x00, 0x80,
  0x40, 0x03, 0x00, 0xc0, 0x00, 0x80, 0x40, 0x07, 0x00, 0x00, 0x01, 0x00, 0x40, 0x06, 0x00, 0x00,
  0x01, 0x00, 0x40, 0x06, 0x00, 0x00, 0x02, 0x00, 0x40, 0x07, 0x00, 0x00, 0x04, 0x00, 0xc0, 0x01,
  0x80, 0x00, 0x08, 0x00, 0xc0, 0x00, 0x01, 0x00, 0x0c, 0x00, 0xc0, 0x80, 0x01, 0x80, 0x04, 0x00,
  0x41, 0x80, 0x07, 0xc0, 0x06, 0x00, 0x41, 0xbc, 0xf8, 0xc0, 0x06, 0x00, 0x41, 0xc3, 0x03, 0xc0,
  0x06, 0x00, 0x40, 0xb8, 0x1f, 0x40, 0x04, 0x00, 0x60, 0x0f, 0xfc, 0x40, 0x0c, 0x00, 0x20, 0x01,
  0x80, 0x00, 0x30, 0x00, 0x30, 0x08, 0x00, 0x00, 0xc0, 0x00, 0x10, 0x07, 0x80, 0x01, 0x00, 0x00,
  0x18, 0x00, 0x00, 0x02, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, 0x0f,
  0x80, 0x00, 0x02, 0x00, 0x00, 0x00, 0xf8, 0x00, 0x03, 0x00, 0x00, 0x00, 0x07, 0x00, 0x03, 0x00,
  0x00, 0x00, 0x00, 0xc0, 0x1c, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
};

const unsigned char vbhead2 [] PROGMEM = {
  0x00, 0x00, 0x03, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x30, 0x00, 0x00, 0x00, 0x00, 0x18, 0x0e,
  0x00, 0x00, 0x06, 0x03, 0xf0, 0x01, 0x80, 0x00, 0x0a, 0x0c, 0x00, 0x00, 0x40, 0x00, 0x12, 0x18,
  0x00, 0x00, 0x60, 0x00, 0x32, 0x30, 0x00, 0x00, 0x20, 0x00, 0x23, 0xc0, 0x00, 0x00, 0x10, 0x00,
  0x20, 0x00, 0x00, 0x00, 0x18, 0x00, 0x30, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x30, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x80, 0x60, 0x00,
  0x00, 0x00, 0x00, 0x80, 0x40, 0x00, 0x00, 0x00, 0x00, 0x80, 0x40, 0x00, 0x00, 0x00, 0x00, 0xc0,
  0x60, 0x0c, 0x01, 0x80, 0x00, 0xc0, 0x20, 0x18, 0x01, 0x80, 0x00, 0xc0, 0x30, 0x10, 0x00, 0xc0,
  0x00, 0xc0, 0x10, 0x00, 0x00, 0x00, 0x00, 0xc0, 0x30, 0x00, 0x00, 0x00, 0x00, 0xc0, 0x30, 0x38,
  0x00, 0x00, 0x00, 0xc0, 0x20, 0x78, 0x02, 0x00, 0x00, 0x80, 0x60, 0x70, 0x41, 0x00, 0x00, 0x80,
  0x40, 0x30, 0xc1, 0xe0, 0x00, 0x80, 0x40, 0x11, 0x81, 0xe0, 0x01, 0x00, 0x40, 0x03, 0x01, 0xc0,
  0x01, 0x00, 0x40, 0x03, 0x01, 0x80, 0x02, 0x00, 0x40, 0x06, 0x00, 0x00, 0x04, 0x00, 0xc0, 0x06,
  0x00, 0x00, 0x08, 0x00, 0xc0, 0x07, 0x00, 0x00, 0x0c, 0x00, 0xc0, 0x03, 0x80, 0x00, 0x04, 0x00,
  0x40, 0x01, 0x00, 0x00, 0x06, 0x00, 0x40, 0x00, 0x00, 0x00, 0x06, 0x00, 0x40, 0x00, 0x00, 0x00,
  0x06, 0x00, 0x40, 0x03, 0x80, 0x00, 0x04, 0x00, 0x60, 0x0f, 0xc0, 0x00, 0x0c, 0x00, 0x20, 0x00,
  0x60, 0x00, 0x30, 0x00, 0x30, 0x03, 0x20, 0x00, 0xc0, 0x00, 0x10, 0x04, 0x80, 0x01, 0x00, 0x00,
  0x18, 0x00, 0x00, 0x02, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, 0x0f,
  0x80, 0x00, 0x02, 0x00, 0x00, 0x00, 0xfc, 0x00, 0x03, 0x00, 0x00, 0x00, 0x07, 0x00, 0x03, 0x00,
  0x00, 0x00, 0x00, 0xc0, 0x1c, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
};

const unsigned char vbhead3 [] PROGMEM = {
  0x00, 0x00, 0x03, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x30, 0x00, 0x00, 0x00, 0x00, 0x18, 0x1e,
  0x00, 0x00, 0x06, 0x03, 0xf0, 0x01, 0x80, 0x00, 0x0a, 0x0c, 0x00, 0x00, 0xc0, 0x00, 0x16, 0x18,
  0x00, 0x00, 0x60, 0x00, 0x32, 0x30, 0x00, 0x00, 0x20, 0x00, 0x23, 0xc0, 0x00, 0x00, 0x10, 0x00,
  0x20, 0x00, 0x00, 0x00, 0x18, 0x00, 0x20, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x30, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x00, 0x30, 0x18, 0x03, 0x00, 0x01, 0x80, 0x60, 0x3c,
  0x03, 0x80, 0x00, 0x80, 0x40, 0x78, 0x03, 0xc0, 0x00, 0x80, 0x40, 0x80, 0x00, 0x20, 0x00, 0xc0,
  0x40, 0x00, 0x00, 0x10, 0x00, 0xc0, 0x20, 0x70, 0x06, 0x00, 0x00, 0xc0, 0x30, 0xe0, 0x07, 0xc0,
  0x00, 0xc0, 0x10, 0xc1, 0x03, 0xe0, 0x00, 0xc0, 0x31, 0x82, 0x00, 0xe0, 0x00, 0xc0, 0x20, 0x04,
  0x00, 0x04, 0x00, 0xc0, 0x20, 0x0c, 0x00, 0x07, 0x00, 0x80, 0x60, 0x08, 0x00, 0x03, 0x80, 0x80,
  0x40, 0x0c, 0x00, 0x01, 0x41, 0x80, 0x40, 0x07, 0x00, 0x01, 0x01, 0x00, 0x40, 0x00, 0x00, 0x00,
  0x81, 0x00, 0x40, 0x00, 0x00, 0x00, 0x82, 0x00, 0xc0, 0x01, 0xc0, 0x00, 0x04, 0x00, 0xc0, 0x00,
  0xe0, 0x00, 0x08, 0x00, 0xc0, 0x00, 0x70, 0x00, 0x08, 0x00, 0xc0, 0x03, 0xf0, 0x00, 0x0c, 0x00,
  0x40, 0x07, 0xf0, 0x00, 0x04, 0x00, 0x40, 0x0f, 0xf8, 0x00, 0x06, 0x00, 0x40, 0x0f, 0xf8, 0x00,
  0x06, 0x00, 0x40, 0x07, 0xf8, 0x00, 0x04, 0x00, 0x60, 0x07, 0xf0, 0x00, 0x0c, 0x00, 0x20, 0x03,
  0xf0, 0x00, 0x30, 0x00, 0x30, 0x01, 0xe0, 0x00, 0xc0, 0x00, 0x10, 0x04, 0x00, 0x01, 0x00, 0x00,
  0x18, 0x03, 0x00, 0x02, 0x00, 0x00, 0x08, 0x00, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, 0x0f,
  0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0xf8, 0x00, 0x03, 0x00, 0x00, 0x00, 0x0f, 0x00, 0x03, 0x00,
  0x00, 0x00, 0x00, 0xc0, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
};

const unsigned char vbhead4 [] PROGMEM = {
  0x00, 0x00, 0x03, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x30, 0x00, 0x00, 0x00, 0x00, 0x18, 0x1e,
  0x00, 0x00, 0x06, 0x03, 0xf0, 0x01, 0x80, 0x00, 0x0a, 0x0c, 0x00, 0x00, 0xc0, 0x00, 0x16, 0x18,
  0x00, 0x00, 0x60, 0x00, 0x32, 0x30, 0x00, 0x00, 0x20, 0x00, 0x23, 0xc0, 0x00, 0x00, 0x10, 0x00,
  0x20, 0x00, 0x00, 0x00, 0x18, 0x00, 0x20, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x30, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x00, 0x30, 0x00, 0x00, 0x00, 0x01, 0x80, 0x60, 0x38,
  0x00, 0x00, 0x00, 0x80, 0x40, 0x78, 0x00, 0x00, 0x00, 0x80, 0x40, 0x80, 0x00, 0x30, 0x00, 0xc0,
  0x40, 0xc4, 0x00, 0x38, 0x00, 0xc0, 0x20, 0xcc, 0x00, 0x18, 0x00, 0xc0, 0x30, 0x78, 0x04, 0x0c,
  0x00, 0xc0, 0x10, 0x70, 0x06, 0x24, 0x00, 0xc0, 0x30, 0xf0, 0x06, 0xf0, 0x00, 0xc0, 0x21, 0xb0,
  0x83, 0xc0, 0x00, 0xc0, 0x21, 0x18, 0x07, 0x00, 0x00, 0x80, 0x60, 0x09, 0x0f, 0x00, 0x00, 0x80,
  0x40, 0x02, 0x19, 0x80, 0x01, 0x80, 0x40, 0x06, 0x09, 0x80, 0x01, 0x00, 0x40, 0x0c, 0x00, 0xc0,
  0x01, 0x00, 0x40, 0x04, 0x00, 0x00, 0x02, 0x00, 0xc0, 0x06, 0x00, 0x00, 0x06, 0x00, 0xc0, 0x00,
  0x00, 0x00, 0x08, 0x00, 0xc1, 0xf0, 0x00, 0x00, 0x08, 0x00, 0xc0, 0x2e, 0x00, 0x00, 0x0c, 0x00,
  0x41, 0x29, 0x80, 0x00, 0x04, 0x00, 0x41, 0xe9, 0x60, 0x00, 0x06, 0x00, 0x41, 0x39, 0x30, 0x00,
  0x06, 0x00, 0x40, 0x8f, 0x28, 0x00, 0x04, 0x00, 0x60, 0xc9, 0xa4, 0x00, 0x0c, 0x00, 0x20, 0x3b,
  0x74, 0x00, 0x30, 0x00, 0x30, 0x0f, 0x5e, 0x00, 0xc0, 0x00, 0x10, 0x01, 0x4e, 0x01, 0x00, 0x00,
  0x18, 0x00, 0x00, 0x02, 0x00, 0x00, 0x08, 0x00, 0xf0, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, 0x0f,
  0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0xf8, 0x00, 0x03, 0x00, 0x00, 0x00, 0x0f, 0x00, 0x03, 0x00,
  0x00, 0x00, 0x00, 0xc0, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
};

const unsigned char vbhead5 [] PROGMEM = {
  0x00, 0x03, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x01, 0x80, 0x00, 0x00, 0x00, 0x18, 0x00, 0x20,
  0x00, 0x00, 0x07, 0xf0, 0x00, 0x10, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00,
  0x00, 0x06, 0x00, 0x00, 0x18, 0x00, 0x00, 0x0d, 0x00, 0x00, 0x10, 0x00, 0x00, 0x0c, 0x80, 0x00,
  0x10, 0x00, 0x00, 0x0c, 0x80, 0x00, 0x10, 0x00, 0x03, 0xec, 0x40, 0x00, 0x10, 0x00, 0x02, 0x1c,
  0x10, 0x00, 0x10, 0x07, 0x02, 0x04, 0x08, 0x00, 0x10, 0x04, 0x02, 0x02, 0x04, 0x00, 0x30, 0x0c,
  0x02, 0x01, 0x04, 0x00, 0x60, 0x08, 0x02, 0x00, 0x04, 0x00, 0xc0, 0x08, 0x01, 0x00, 0x04, 0x00,
  0x80, 0x0c, 0x01, 0x00, 0x0c, 0x00, 0x80, 0x04, 0x13, 0x00, 0x08, 0x00, 0x41, 0xc6, 0x1f, 0x00,
  0x04, 0x00, 0x41, 0x42, 0x08, 0x00, 0x02, 0x00, 0x62, 0x22, 0x08, 0x00, 0x02, 0x00, 0x42, 0x16,
  0x08, 0x00, 0x01, 0x00, 0x42, 0x0c, 0x08, 0x00, 0x01, 0x00, 0x40, 0x00, 0x18, 0x00, 0x01, 0x00,
  0x41, 0x00, 0x18, 0x08, 0x00, 0x80, 0x21, 0x80, 0x10, 0x08, 0x00, 0x80, 0x23, 0x40, 0x30, 0x08,
  0xc0, 0x80, 0x16, 0x20, 0x60, 0x07, 0x80, 0x80, 0x02, 0x0f, 0x80, 0x0e, 0x00, 0x80, 0x01, 0x00,
  0x00, 0xfc, 0x00, 0x80, 0x01, 0x00, 0x00, 0x04, 0x00, 0x80, 0x00, 0x80, 0x00, 0x0c, 0x01, 0x80,
  0x00, 0xc0, 0x01, 0x00, 0x01, 0x00, 0x00, 0x40, 0x30, 0x80, 0x09, 0x00, 0x00, 0x20, 0x30, 0x00,
  0x1b, 0x00, 0x00, 0x10, 0x30, 0x40, 0x12, 0x00, 0x00, 0x08, 0xb6, 0x20, 0x36, 0x00, 0x00, 0x04,
  0x7c, 0x24, 0x6c, 0x00, 0x00, 0x02, 0x10, 0x1c, 0x48, 0x00, 0x00, 0x01, 0x88, 0x00, 0xd0, 0x00,
  0x00, 0x00, 0x40, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x18, 0x03, 0x20, 0x00, 0x00, 0x00, 0x07, 0x87,
  0x20, 0x00, 0x00, 0x00, 0x00, 0xf8, 0xa0, 0x00, 0x00, 0x00, 0x00, 0x08, 0x20, 0x00, 0x00, 0x00,
  0x00, 0x04, 0x20, 0x00, 0x00, 0x00, 0x00, 0x03, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

const unsigned char radsign [] PROGMEM = {
  0x00, 0x00, 0x00, 0x0c, 0x01, 0x80, 0x1c, 0x01, 0xc0, 0x3e, 0x03, 0xe0, 0x3e, 0x03, 0xe0, 0x7f,
  0x07, 0xf0, 0x7f, 0x8f, 0xf0, 0xff, 0x8f, 0xf8, 0xff, 0x27, 0xf8, 0xfe, 0x73, 0xf8, 0x00, 0x70,
  0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf8, 0x00, 0x00, 0xf8, 0x00, 0x01, 0xfc, 0x00,
  0x01, 0xfc, 0x00, 0x03, 0xfe, 0x00, 0x07, 0xff, 0x00, 0x03, 0xfe, 0x00, 0x00, 0xf8, 0x00
};

const unsigned char biosign [] PROGMEM = {
  0x00, 0x00, 0x00, 0x01, 0x8c, 0x00, 0x03, 0x06, 0x00, 0x06, 0x03, 0x00, 0x0e, 0x03, 0x80, 0x0e,
  0x01, 0x80, 0x0e, 0xf9, 0x80, 0x0f, 0xff, 0x80, 0x1f, 0x07, 0xc0, 0x3f, 0x8f, 0xe0, 0x7f, 0xff,
  0xf0, 0xef, 0xdd, 0xb8, 0xc6, 0xdb, 0x98, 0x86, 0x73, 0x08, 0x87, 0x77, 0x08, 0x83, 0xfe, 0x08,
  0x01, 0xfc, 0x00, 0x00, 0xf8, 0x00, 0x21, 0xfc, 0x20, 0x1f, 0xdf, 0xc0, 0x07, 0x07, 0x00
};

/*
  const unsigned char physign [] PROGMEM = {  // Broken heart
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x07, 0x80, 0x3f, 0x87, 0xe0, 0x7f, 0x0f, 0xf0, 0x7f,
  0x03, 0xf0, 0xff, 0xc3, 0xf8, 0xff, 0xc7, 0xf8, 0xff, 0x8f, 0xf8, 0x7f, 0x8f, 0xf0, 0x7f, 0x87,
  0xf0, 0x3f, 0xcf, 0xe0, 0x3f, 0xcf, 0xe0, 0x1f, 0x9f, 0xc0, 0x0f, 0x9f, 0x80, 0x03, 0xbe, 0x00,
  0x01, 0xfc, 0x00, 0x00, 0xf8, 0x00, 0x00, 0x70, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00
  };
*/

/*
  const unsigned char physign [] PROGMEM = {  // Explosion
  0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x30, 0x00, 0x00, 0x30, 0x00, 0x00, 0x30, 0x00, 0x00,
  0x78, 0x10, 0x20, 0x78, 0x20, 0x18, 0xed, 0xe0, 0x1f, 0xcf, 0xc0, 0x09, 0x86, 0xc0, 0x0c, 0x90,
  0xc0, 0x0c, 0x12, 0x80, 0x0c, 0xb4, 0x80, 0x1e, 0xfd, 0xe0, 0x78, 0x78, 0x70, 0x31, 0xfe, 0x20,
  0x1c, 0xfc, 0x60, 0x0c, 0xfc, 0xc0, 0x05, 0x34, 0xc0, 0x08, 0x52, 0x60, 0x00, 0x00, 0x00
  };
*/

const unsigned char physign [] PROGMEM = {  // Fist
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x03, 0xd0, 0x00, 0x07, 0xb8, 0x00, 0x07,
  0x78, 0x00, 0x00, 0x76, 0x00, 0x0f, 0xae, 0x00, 0x1f, 0xdd, 0x80, 0x1c, 0x1b, 0x80, 0x3f, 0x9b,
  0x80, 0x3f, 0x87, 0x00, 0x3f, 0x98, 0x00, 0x1f, 0xbf, 0x00, 0x1f, 0xff, 0x00, 0x0f, 0xff, 0x00,
  0x07, 0xff, 0x00, 0x01, 0xfe, 0x00, 0x07, 0xf0, 0x00, 0x07, 0xfe, 0x00, 0x00, 0x00, 0x00
};

const unsigned char waterdrop [] PROGMEM = {
  0x00, 0x20, 0x00, 0x00, 0x70, 0x00, 0x00, 0x70, 0x00, 0x00, 0xf8, 0x00, 0x00, 0xf8, 0x00, 0x01,
  0xfc, 0x00, 0x01, 0xfc, 0x00, 0x03, 0xfe, 0x00, 0x03, 0xfe, 0x00, 0x07, 0xff, 0x00, 0x06, 0xff,
  0x00, 0x04, 0xff, 0x00, 0x0c, 0xff, 0x80, 0x0c, 0x7f, 0x80, 0x0c, 0x7f, 0x80, 0x0c, 0x7f, 0x80,
  0x0f, 0xff, 0x80, 0x07, 0xff, 0x00, 0x07, 0xff, 0x00, 0x03, 0xfe, 0x00, 0x00, 0xf8, 0x00
};

const unsigned char forkknife [] PROGMEM = {
  0x00, 0x01, 0x80, 0xe0, 0x02, 0x80, 0x90, 0x05, 0x60, 0x88, 0x0a, 0xe0, 0x84, 0x15, 0x58, 0x42,
  0x2a, 0xa8, 0x41, 0x2d, 0x50, 0x20, 0xa2, 0xa0, 0x10, 0x53, 0x40, 0x08, 0x68, 0x80, 0x07, 0x8f,
  0x00, 0x01, 0x98, 0x00, 0x03, 0x2c, 0x00, 0x06, 0x66, 0x00, 0x0c, 0x93, 0x00, 0x19, 0x09, 0x80,
  0x22, 0x04, 0x40, 0x44, 0x02, 0x20, 0x08, 0x01, 0x20, 0x98, 0x00, 0x90, 0x70, 0x00, 0x60
};

const unsigned char snowflake [] PROGMEM = {
  0x01, 0x04, 0x00, 0x00, 0xa8, 0x00, 0x08, 0x70, 0x80, 0x09, 0x24, 0x80, 0x38, 0xa8, 0xe0, 0x04,
  0x71, 0x00, 0x02, 0x22, 0x00, 0x91, 0x24, 0x48, 0x48, 0xa8, 0x90, 0x24, 0x71, 0x20, 0x7f, 0xff,
  0xf0, 0x24, 0x71, 0x20, 0x48, 0xa8, 0x90, 0x91, 0x24, 0x48, 0x02, 0x22, 0x00, 0x04, 0x71, 0x00,
  0x38, 0xa8, 0xe0, 0x09, 0x24, 0x80, 0x08, 0x70, 0x80, 0x00, 0xa8, 0x00, 0x01, 0x04, 0x00
};

const unsigned char flame [] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x60, 0x00, 0x00, 0x30, 0x00, 0x00, 0x30, 0x00, 0x00, 0x38, 0x00, 0x01,
  0x38, 0x00, 0x01, 0xb8, 0x00, 0x01, 0xfc, 0x00, 0x01, 0xfe, 0x00, 0x01, 0xff, 0x00, 0x03, 0xff,
  0x00, 0x07, 0xff, 0x00, 0x17, 0xff, 0x00, 0x17, 0xdf, 0x40, 0x1f, 0xdf, 0xc0, 0x1f, 0xcf, 0xc0,
  0x1f, 0x0f, 0xc0, 0x0f, 0x03, 0xc0, 0x07, 0x07, 0x80, 0x03, 0x87, 0x00, 0x00, 0x80, 0x00
};

const unsigned char thermarrow [] PROGMEM = {
  0x80, 0xc0, 0xe0, 0xe0, 0xc0, 0x80
};

// Power voltage (on Wemos D1 mini ADC shows about 300 mV lower than actual voltage)
int mVolt = 2900;
const int lowVolt = 2400;

// UCP31
const String protoID = "FT3"; // Protocol version and/or command set identifier, 3 symbols
const int ScanStackSize = 10;
ScanEntry ScanStack[ScanStackSize];

// Button
bool buttonWasPressed = false;
char NFCintent = ' '; // What should NFC routines do after certain click type and TagTimer runs out

// Timers
unsigned long ScreenOnTimeout = 12000;  // Better set more than SuicideTimeout
unsigned long LongClickTimeout = 500;
unsigned long ShortClickTimeout = 200;
unsigned long TempIndTimeout = 3000;
unsigned long BackupTimeoutSec = 300;
unsigned long MLTimeout = 1000;
unsigned long ReviveTimeoutMin = 60;
unsigned long PerkTimeoutMin = 60;  // Calculate it later in MLCount()
unsigned long TagTimeout = 5000;
unsigned long SplashTimeout = 500;  // Wifi splash time with ssid to command external device
unsigned long SuicideTimeout = 10000;
bool ScreenOnTimeActive = true;
unsigned long ScreenOnTimeStart = 0;
bool LongClickTimeActive = false;
unsigned long LongClickTimeStart = 0;
bool ShortClickTimeActive = false;
unsigned long ShortClickTimeStart = 0;
bool TempIndTimeActive = false;
unsigned long TempIndTimeStart = 0;
bool BackupTimeActive = true;
unsigned long BackupTimeStart = 0;
bool MLTimeActive = true;
unsigned long MLTimeStart = 0;
bool ReviveTimeActive = false;
unsigned long ReviveTimeStart = 0;
bool PerkTimeActive = true;
unsigned long PerkTimeStart = 0;
bool TagTimeActive = false;
unsigned long TagTimeStart = 0;
bool SplashTimeActive = false;
unsigned long SplashTimeStart = 0;
bool SuicideTimeActive = false;
unsigned long SuicideTimeStart = 0;
unsigned long blinklow = 300;
unsigned long blinkhigh = 300;
unsigned long blinktime = 0;
bool blinkstate = false;
unsigned long LBblinklow = 2711; // Low battery blinking indication. Using primes for timeouts for not intersecting too much with regular indication
unsigned long LBblinkhigh = 1193;
unsigned long LBblinktime = 0;
bool LBblinkstate = false;

// Interpreter memory usage config
#define IOArrSize 32
#define OpstackSize 16
#define EffectsSize 50

// MetaLife
int MLP[43]; // Element 0 is EEPROM data presence flag, for the rest see as #defined above
EffectEntry Effects[EffectsSize];
int MLC[8]; // ML Check array - for checking if change of info SSID is required

// External data field dividers
const char ssidDiv = '_';
const char headValDiv = ':';
const char outEffDiv = char(10);
const char inEffDiv = ' ';

// Debug - comment or remove in production
//unsigned long LastCycleTimeStamp = 0;

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
  nfc.begin();
  CheckNFCmodule();
  pn532.powerDown(16, 0);

  NFCStr.reserve(720);
  DeathCauseStr.reserve(20);
  TempMessageStr.reserve(40);
  TempTextStr.reserve(300);

  EEPROM.begin(EEPROMSIZE);
  delay(100);
  LoadMLData();
  if (MLP[0] != 18) { // version B8 data code
    InitMLP();
    ClearEffects();
  }

  ScanSTA();
  BootScreen();
}

void loop() {
  delay(30);
  mVolt = ESP.getVcc();
  ScanCheck();
  ButtonCheck();
  TimersCheck();
  Indicate();
}

void ScanSTA() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  WiFi.setPhyMode(WIFI_PHY_MODE_11B);
  WiFi.scanNetworks(true, false, 4);
}

// USE STA ONLY FOR BATTERY ECONOMY IF NO GAME MECHANICS USES IT
void InfoAP(bool forcedFlag) { // Check if any of effective SPECIAL parameters or Player ID has changed, if yes - update info AP SSID
  bool updFlag = false;
  for (int i = 1; i < 8; i++) {
    if (MLP[i] + MLP[i + 7] != MLC[i]) {
      MLC[i] = MLP[i] + MLP[i + 7];
      updFlag = true;
    }
  }
  if (MLP[PLAYERID] != MLC[0]) {
    MLC[0] = MLP[PLAYERID];
    updFlag = true;
  }
  if (updFlag || forcedFlag) {
    String infSsid = "";
    if (MLP[LIFE] > 0) {
      infSsid = "LPi-";
    } else {
      infSsid = "DPi-";
    }
    for (int i = 0; i < 8; i++) {
      infSsid += String(MLC[i]);
      if (i < 7) infSsid += "-";
    }
    WiFi.softAP(infSsid.c_str(), "nooneknows", 4, false, 0);
    WiFi.setOutputPower(float(5));
  }
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

void BootScreen() {
  int bootStrDelay = 350;
  display.clearDisplay();
  display.setFont();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("PIP-OS(R)");
  display.display();
  digitalWrite(BUZZER, HIGH);
  delay(1);
  digitalWrite(BUZZER, LOW);
  delay(bootStrDelay);
  display.setCursor(0, 8);
  display.print("ver 18.1");
  display.display();
  digitalWrite(BUZZER, HIGH);
  delay(1);
  digitalWrite(BUZZER, LOW);
  delay(bootStrDelay);
  display.setCursor(0, 16);
  display.print("Copyright");
  display.display();
  digitalWrite(BUZZER, HIGH);
  delay(1);
  digitalWrite(BUZZER, LOW);
  delay(bootStrDelay);
  display.setCursor(0, 24);
  display.print("ROBCO 2075");
  display.display();
  digitalWrite(BUZZER, HIGH);
  delay(1);
  digitalWrite(BUZZER, LOW);
  delay(bootStrDelay);
  display.setCursor(0, 32);
  display.print("PIP ID ");
  display.print(MLP[PLAYERID]);
  display.display();
  digitalWrite(BUZZER, HIGH);
  delay(1);
  digitalWrite(BUZZER, LOW);
  delay(bootStrDelay);
  display.setCursor(0, 40);
  display.print("80k RAM");
  display.display();
  digitalWrite(BUZZER, HIGH);
  delay(1);
  digitalWrite(BUZZER, LOW);
  delay(bootStrDelay);
}

void MLCount() {
  if (MLP[LIFE] > 0) {  // If alive
    for (int i = 8; i < 15; i++) { // Set modifiers to zero, later they can be changed by effects
      MLP[i] = 0;
    }
    for (int i = 21; i < 24; i++) { // Set resistances to zero, later they can be changed by effects
      MLP[i] = 0;
    }
    if (MLP[RACE] == 2) MLP[PHYSICALRESIST] = 8;  // Supermutant basic physical resist
    int lifeBefore = MLP[LIFE];
    CalcEffects();
    int lifeDiff = MLP[LIFE] - lifeBefore;
    if (MLP[RACE] == 1 && lifeDiff > 0) MLP[LIFE] = lifeBefore + lifeDiff / 5;  // Ghoul preparate healing reduction
    if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "болезни";
    for (int i = 1; i < 8; i++) { // Limit SPECIAL if it became out of range somehow. This may happen if an effect have changed parameter itself instead of modifier
      if (MLP[i] < 1) MLP[i] = 1;
      if (MLP[i] > 10) MLP[i] = 10;
    }
    for (int i = 1; i < 8; i++) { // Check modifiers so resulting SPECIAL parameters will be in 1..10 range
      if (MLP[i] + MLP[i + 7] <= 0) MLP[i + 7] = 1 - MLP[i];
      if (MLP[i] + MLP[i + 7] > 10) MLP[i + 7] = 10 - MLP[i];
    }
    if (MLP[RADDOSE] < 0) MLP[RADDOSE] = 0; // Prevent negative RadDose set by effects
    // Armor and resistances calculation
    if (MLP[ARMORSTATE] > MLP[MAXARMOR]) MLP[ARMORSTATE] = MLP[MAXARMOR];  // Limit Armorstate to Maxarmor
    int armorDamage = 0;  // How much damage armor prevented and taken. Radiation and Thermo does not damage armor.
    int armRadDef = 0;
    int armPhysDef = 0;
    int armChembioDef = 0;
    int armThermoDef = 0;
    if (MLP[ARMORSTATE] > 0) {  // If there is an armor, calculate defenses according to resistances and armor state
      if (MLP[ARADRESIST] != 0) armRadDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[ARADRESIST]);
      if (MLP[APHYSRESIST] != 0) armPhysDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[APHYSRESIST]);
      if (MLP[ACHEMBIORESIST] != 0) armChembioDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[ACHEMBIORESIST]);
      if (MLP[ATHERMOINSULATION] != 0) armThermoDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[ATHERMOINSULATION]);
    }
    if (MLP[RADNOW] > 0) {  // Apply resistances. ATHERMOINSULATION is calculated in TempReserve()
      MLP[RADNOW] = MLP[RADNOW] - MLP[RADRESIST] - armRadDef;
      if (MLP[RADNOW] < 0) MLP[RADNOW] = 0;
    }
    if (MLP[PHYSICAL] > 0) {
      randomSeed(millis());
      if (random(2, 21) > MLP[AGILITY] + MLP[MODAGILITY] + MLP[LUCK] + MLP[MODLUCK]) {
        if (MLP[PHYSICAL] >= armPhysDef) {
          armorDamage += armPhysDef;
        } else {
          armorDamage += MLP[PHYSICAL];
        }
        MLP[PHYSICAL] = MLP[PHYSICAL] - MLP[PHYSICALRESIST] - armPhysDef;
        if (MLP[PHYSICAL] < 0) MLP[PHYSICAL] = 0;
      } else {
        MLP[PHYSICAL] = 0;  // Lucky and agile player avoids physical damage
      }
    }
    if (MLP[CHEMBIO] > 0) {
      if (MLP[CHEMBIO] >= armChembioDef) {
        armorDamage += armChembioDef;
      } else {
        armorDamage += MLP[CHEMBIO];
      }
      MLP[CHEMBIO] = MLP[CHEMBIO] - MLP[CHEMBIORESIST] - armChembioDef;
      if (MLP[CHEMBIO] < 0) MLP[CHEMBIO] = 0;
    }
    MLP[ARMORSTATE] = MLP[ARMORSTATE] - armorDamage;  // Comment this line to disable armorDamage
    if (MLP[ARMORSTATE] < 0) MLP[ARMORSTATE] = 0;
    if (MLP[AMBIENTTEMP] + MLP[MODTEMP] == 0) {
      ThermalState = 0;
      if (MLP[PLAYERTEMP] < 0) {  // Idle temp normalizing
        MLP[PLAYERTEMP]++;
      } else if (MLP[PLAYERTEMP] > 0) {
        MLP[PLAYERTEMP]--;
      }
    } else {
      MLP[PLAYERTEMP] = MLP[PLAYERTEMP] + MLP[AMBIENTTEMP] + MLP[MODTEMP];
      if (MLP[AMBIENTTEMP] + MLP[MODTEMP] > 0) {
        ThermalState = 1;
      } else {
        ThermalState = -1;
      }
      if (MLP[PLAYERTEMP] > TempReserve()) {
        ThermalState = 2;
        MLP[PLAYERTEMP] = TempReserve();
        MLP[LIFE] = MLP[LIFE] - (12 - MLP[ENDURANCE] + MLP[MODENDURANCE]) / 2; // Heat damage
        if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "перегрева";
      } else if (MLP[PLAYERTEMP] < TempReserve() * -1) {
        ThermalState = -2;
        MLP[PLAYERTEMP] = TempReserve() * -1;
        MLP[LIFE] = MLP[LIFE] - (12 - MLP[ENDURANCE] + MLP[MODENDURANCE]) / 2; // Freeze damage
        if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "холода";
      }
    }
    MLP[FOOD] = MLP[FOOD] - MLP[FOODPERCYC];
    MLP[WATER] = MLP[WATER] - MLP[WATERPERCYC];
    if (MLP[FOOD] < 0) MLP[FOOD] = 0;
    if (MLP[WATER] < 0) MLP[WATER] = 0;
    if (MLP[FOOD] == 0) MLP[LIFE] = MLP[LIFE] - 1; // Hunger damage
    if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "голода";
    if (MLP[WATER] == 0) MLP[LIFE] = MLP[LIFE] - 1; // Thirst damage
    if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "жажды";
    MLP[LIFE] = MLP[LIFE] - MLP[CHEMBIO]; // Apply chembio and physical damages to Life
    if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "хим. урона";
    MLP[LIFE] = MLP[LIFE] - MLP[PHYSICAL];
    if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "физ. урона";
    if (MLP[RACE] == 1) MLP[LIFE] = MLP[LIFE] + MLP[RADNOW];  // Add current radiation to life for ghouls
    MLP[RADDOSE] = MLP[RADDOSE] + MLP[RADNOW];  // Add current radiation to dose
    if (MLP[RACE] == 0) { // RadDose limits MaxLife for humans only
      MLP[MAXLIFE] = (100 + (MLP[STRENGTH] + MLP[MODSTRENGTH]) * (MLP[ENDURANCE] + MLP[MODENDURANCE]) * 10) - MLP[RADDOSE] / 4;  // Calculate MaxLife
    } else {
      MLP[MAXLIFE] = (100 + (MLP[STRENGTH] + MLP[MODSTRENGTH]) * (MLP[ENDURANCE] + MLP[MODENDURANCE]) * 10);  // Ghouls and Supermutants are resistant to radiation
    }
    if (MLP[LIFE] > MLP[MAXLIFE]) MLP[LIFE] = MLP[MAXLIFE]; // Life not to exceed MaxLife
    if (MLP[LIFE] <= 0 && DeathCauseStr == "") DeathCauseStr = "радиации";
    if (MLP[LIFE] < 0) MLP[LIFE] = 0; // Dead
    PerkTimeoutMin = (11 - MLP[AGILITY] + MLP[MODAGILITY]) * 10; // ADJUST PERK RECHARGE TIME HERE
  }
}

int MaxLifeFromSpecial() {
  return 100 + MLP[STRENGTH] * MLP[ENDURANCE] * 10; // To change it only here if needed. Note that in MLCount() similar formula with modifiers also should be changed then.
}

int TempReserve() {
  return 100 + (MLP[STRENGTH] + MLP[MODSTRENGTH]) * 200 + MLP[ATHERMOINSULATION];
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
  if (MLP[LIFE] <= 0 && WasAliveFlag) IndicationMode = 'A';
  if (IndicationMode == 'A') {
    display.setFont();  // Default font
    if (MLP[LIFE] <= 0) { // Dead
      ScreenOnTimeActive = true;
      ScreenOnTimeStart = 0;
      if (WasAliveFlag) {
        display.drawBitmap(0, 0, vbhead5, 42, 48, 1);
        display.display();
        WasAliveFlag = false;
        SaveMLData();
        digitalWrite(BUZZER, HIGH);
        delay(3000);
        digitalWrite(BUZZER, LOW);
        return;
      } else {
        display.setFont(RUSFNT);
        display.setCursor(0, 22);
        display.print(utf8rus("ПОГИБ ОТ"));
        display.setCursor(0, 34);
        if (DeathCauseStr == "") {
          display.print(utf8rus("чего-то"));
        } else {
          display.print(utf8rus(DeathCauseStr));
        }
      }
    } else { // Still alive
      bool hungerAlert = MLP[FOOD] < MLP[FOODPERCYC] * 600;  // alert 10 minutes before hunger begins
      bool thirstAlert = MLP[WATER] < MLP[WATERPERCYC] * 600;
      if (hungerAlert || thirstAlert) {
        ScreenOnTimeActive = true;
        ScreenOnTimeStart = 0;
      }
      if (!ScreenOnTimeActive && IndicationMode != 'S') {
        display.display();
        return;
      }
      //Debug - comment or remove in production
      /*display.setCursor(43, 0);
        display.print(String(millis() - LastCycleTimeStamp));
        LastCycleTimeStamp = millis();*/
      //End of debug section
      if (blinkstate && (hungerAlert || thirstAlert)) {
        if (hungerAlert) display.drawBitmap(0, 27, forkknife, 21, 21, 1);
        if (thirstAlert) display.drawBitmap(0, 0, waterdrop, 21, 21, 1);
      } else {
        int lifePc = map(MLP[LIFE], 0, MaxLifeFromSpecial(), 0, 100);
        if (lifePc < 25) {
          display.drawBitmap(0, 0, vbhead4, 42, 48, 1);
        } else if (lifePc >= 25  && lifePc < 50) {
          display.drawBitmap(0, 0, vbhead3, 42, 48, 1);
        } else if (lifePc >= 50  && lifePc < 75) {
          display.drawBitmap(0, 0, vbhead2, 42, 48, 1);
        } else if (lifePc >= 75) {
          display.drawBitmap(0, 0, vbhead1, 42, 48, 1);
        }
      }
      if (MLP[PLAYERTEMP] != 0) { // Display thermal gauge
        display.drawBitmap(60, 21, thermarrow, 3, 6, 1);
        display.drawLine(63, 48, 63, map(MLP[PLAYERTEMP], TempReserve() * -1, TempReserve(), 48, 0), WHITE);
      }
      if (!blinkstate || (MLP[RADNOW] == 0 && !RadPflag )) {  // Display thermal state
        if (ThermalState == 0) {
          //display.setCursor(44, 6);
          //display.print("0C");
          //display.drawCircle(59, 4, 2, WHITE);
        } else if (ThermalState == -1) {
          display.setCursor(44, 6);
          display.print("-C");
          display.drawCircle(59, 4, 2, WHITE);
        } else if (ThermalState == -2) {
          display.drawBitmap(42, 0, snowflake, 21, 21, 1);
        } else if (ThermalState == 1) {
          display.setCursor(44, 6);
          display.print("+C");
          display.drawCircle(59, 4, 2, WHITE);
        } else if (ThermalState == 2) {
          display.drawBitmap(42, 0, flame, 21, 21, 1);
        }
      }
      if ((MLP[RADNOW] > 0 || RadPflag) && MLP[SHELTER] <= 0) { // Radiation
        if (blinkstate) display.drawBitmap(42, 0, radsign, 21, 21, 1);
        if (MLP[RADNOW] - MLP[RADRESIST] > 0) {
          if (random(-10, MLP[RADNOW] - MLP[RADRESIST] + 1) > 0) { // Buzzer should not tick when RADNOW is 0 and only RadPflag is raised
            digitalWrite(BUZZER, HIGH);
            delay(1);
            digitalWrite(BUZZER, LOW);
          }
        }
      }
      if ((MLP[CHEMBIO] != 0 || MLP[PHYSICAL] != 0 || ChemPflag || PhyPflag) && MLP[SHELTER] <= 0) {  // If any of Chembio or Physical effects or detection are present
        if (blinkstate) {
          if (MLP[CHEMBIO] != 0 || ChemPflag) display.drawBitmap(42, 27, biosign, 21, 21, 1);
          if (MLP[CHEMBIO] - MLP[CHEMBIORESIST] > 0 || MLP[PHYSICAL] - MLP[PHYSICALRESIST] > 0) digitalWrite(BUZZER, HIGH); // Beep on any effect but not on detection
        } else {
          if (MLP[PHYSICAL] != 0 || PhyPflag) display.drawBitmap(42, 27, physign, 21, 21, 1); // Counterphase indication of two signs on same display coordinates
          //digitalWrite(BUZZER, LOW); // It is moved to BlinkTimer for now
        }
      }
    }
  } else if (IndicationMode == 'B') { // Display SPECIAL
    display.setFont();  // Default font
    display.setCursor(0, 0);
    display.print(MLP[LIFE]);
    display.print("/");
    display.println(MLP[MAXLIFE]);
    display.print("S:");
    display.print(MLP[STRENGTH] + MLP[MODSTRENGTH]);
    if (MLP[MODSTRENGTH] > 0) {
      display.print("+");
    } else if (MLP[MODSTRENGTH] < 0) {
      display.print("-");
    }
    display.setCursor(34, 8);
    display.print("I:");
    display.print(MLP[INTELLECT] + MLP[MODINTELLECT]);
    if (MLP[MODINTELLECT] > 0) {
      display.print("+");
    } else if (MLP[MODINTELLECT] < 0) {
      display.print("-");
    }
    display.setCursor(0, 16);
    display.print("P:");
    display.print(MLP[PERCEPTION] + MLP[MODPERCEPTION]);
    if (MLP[MODPERCEPTION] > 0) {
      display.print("+");
    } else if (MLP[MODPERCEPTION] < 0) {
      display.print("-");
    }
    display.setCursor(34, 16);
    display.print("A:");
    display.print(MLP[AGILITY] + MLP[MODAGILITY]);
    if (MLP[MODAGILITY] > 0) {
      display.print("+");
    } else if (MLP[MODAGILITY] < 0) {
      display.print("-");
    }
    display.setCursor(0, 24);
    display.print("E:");
    display.print(MLP[ENDURANCE] + MLP[MODENDURANCE]);
    if (MLP[MODENDURANCE] > 0) {
      display.print("+");
    } else if (MLP[MODENDURANCE] < 0) {
      display.print("-");
    }
    display.setCursor(34, 24);
    display.print("L:");
    display.print(MLP[LUCK] + MLP[MODLUCK]);
    if (MLP[MODLUCK] > 0) {
      display.print("+");
    } else if (MLP[MODLUCK] < 0) {
      display.print("-");
    }
    display.setCursor(0, 32);
    display.print("C:");
    display.print(MLP[CHARISMA] + MLP[MODCHARISMA]);
    if (MLP[MODCHARISMA] > 0) {
      display.print("+");
    } else if (MLP[MODCHARISMA] < 0) {
      display.print("-");
    }
    display.setCursor(0, 40);
    display.print("RAD:");
    display.print(MLP[RADDOSE]);
  } else if (IndicationMode == 'C') { // Display water and food status
    display.setFont();
    // DEBUG
    //display.setCursor(32, 0);
    //display.print(mVolt);
    // END OF DEBUG
    display.drawBitmap(0, 0, waterdrop, 21, 21, 1);
    display.drawBitmap(0, 27, forkknife, 21, 21, 1);
    display.setCursor(27, 8);
    display.print(TimeFormatSec(MLP[WATER] / MLP[WATERPERCYC], true, false));
    display.setCursor(27, 35);
    display.print(TimeFormatSec(MLP[FOOD] / MLP[FOODPERCYC], true, false));
  } else if (IndicationMode == 'D') { // Display resistances
    int armorPc = 0;
    int armRadDef = 0;
    int armPhysDef = 0;
    int armChembioDef = 0;
    int armThermoDef = 0;
    if (MLP[ARMORSTATE] > 0) {
      armorPc = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, 100); // Trying to avoid floating point calculation
      if (MLP[ARADRESIST] != 0) armRadDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[ARADRESIST]);
      if (MLP[APHYSRESIST] != 0) armPhysDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[APHYSRESIST]);
      if (MLP[ACHEMBIORESIST] != 0) armChembioDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[ACHEMBIORESIST]);
      if (MLP[ATHERMOINSULATION] != 0) armThermoDef = map(MLP[ARMORSTATE], 0, MLP[MAXARMOR], 0, MLP[ATHERMOINSULATION]);
    }
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    if (MLP[ARMORSTATE] <= 0) {
      display.print(utf8rus("  брони нет"));
    } else {
      display.print(utf8rus("броня"));
      display.setCursor(34, 8);
      display.print(armorPc);
      display.print("%");
    }
    display.drawBitmap(0, 14, radsign, 21, 21, 1);
    display.drawBitmap(22, 14, biosign, 21, 21, 1);
    display.drawBitmap(43, 14, physign, 21, 21, 1);
    display.setFont();
    DigitsCenterPrint((MLP[RADRESIST] + armRadDef), 0, 40);
    DigitsCenterPrint((MLP[CHEMBIORESIST] + armChembioDef), 23, 40);
    DigitsCenterPrint((MLP[PHYSICALRESIST] + armPhysDef), 46, 40);
    //display.display();
  } else if (IndicationMode == 'M') { // Display temporary message
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    display.println(utf8rus(TempMessageStr));
    if (TempTextStr != "") RunningString(TempTextStr, 44);
  } else if (IndicationMode == 'R') { // Display time to revival
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    display.println(utf8rus("оживет"));
    display.println(utf8rus("через"));
    display.println(TimeFormatSec((ReviveTimeStart + ReviveTimeoutMin * 60000 - millis()) / 1000, true, true));
    //display.display();
  } else if (IndicationMode == 'P') { // Display time to perk or perk ready. Should be enabled only if MLP[PERK] != 0
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    if (MLP[PERK] == 1) { // Doctor perk
      display.println(utf8rus("раздать"));
      display.println(utf8rus("препарат"));
    } else if (MLP[PERK] == 2) { // Survivalist perk
      display.println(utf8rus("очистить"));
      display.println(utf8rus("еду/воду"));
    } else if (MLP[PERK] == 3) {  // Party king perk. Does not involve PerkTimer, so does not show it.
      display.println(utf8rus("король"));
      display.println(utf8rus("вечеринок"));
      display.display();
      return;
    } else if (MLP[PERK] == 4) { // Orator perk
      display.println(utf8rus("сказать"));
      display.println(utf8rus("речь"));
    } else if (MLP[PERK] == 5) { // Engineer perk
      display.println(utf8rus("применить"));
      display.println(utf8rus("инструмент"));
    }
    if (PerkTimeActive) {
      display.println(TimeFormatSec((PerkTimeStart + PerkTimeoutMin * 60000 - millis()) / 1000, true, true));
    } else {
      display.println(utf8rus("готов"));
    }
  } else if (IndicationMode == 'T') { // Display countdown to tag read/write
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    if (NFCintent == 'R') {
      display.println(utf8rus("тест"));
    } else if (NFCintent == 'C') {
      display.println(utf8rus("принятие"));
    } else if (NFCintent == 'P') {
      display.println(utf8rus("перк"));
    }
    display.println(utf8rus("приложите"));
    display.print(utf8rus("метку "));
    if (TagTimeStart == 0) TagTimeStart = millis();
    display.println((TagTimeStart + TagTimeout - millis()) / 1000);
  } else if (IndicationMode == 'Z') {
    display.setFont(RUSFNT);
    display.setCursor(0, 22);
    display.print(utf8rus("ТЕБЯ"));
    display.setCursor(0, 34);
    display.print(utf8rus("УБИЛИ?"));
  } else if (IndicationMode == 'z') {
    display.setFont(RUSFNT);
    display.setCursor(0, 8);
    display.println(utf8rus("умрет"));
    display.println(utf8rus("через"));
    display.println(TimeFormatSec((SuicideTimeStart + SuicideTimeout - millis()) / 1000, true, true));
  } else if (IndicationMode == 'S') {
    display.setFont();
    display.setCursor(0, 0);
    display.print("Scan: ");
    MLP[SHELTER] = 3;
    int hrssi = -100;
    String hssid = "";
    int tacount = 0;
    for (int j = 0; j < ScanStackSize; j++) {
      if (ScanStack[j].rssi > -100) {
        tacount++;
        if (ScanStack[j].rssi > hrssi) {
          hrssi = ScanStack[j].rssi;
          hssid = ScanStack[j].ssid.substring(protoID.length());
        }
      }
    }
    display.println(tacount);
    if (hrssi > -100) display.println(hrssi);
    display.println(hssid);
  }
  display.display();
}

void RunningString(String rstr, int ycoord) { // Optimize memory usage HERE
  rstr = "                    " + rstr;
  display.setTextWrap(false);
  display.setCursor(0, ycoord);
  display.print(utf8rus(rstr.substring(rs_offset)));
  display.setTextWrap(true);
  if (rs_millis == 0) rs_millis = millis();
  if (150 < millis() - rs_millis) {
    rs_millis = millis();
    if (rs_offset >= rstr.length()) {
      rs_offset = 0;
      if (TempIndTimeActive) {
        TempIndTimeStart = 0;
        TempIndTimeActive = false;
        IndicationMode = PrevIndMode;
        TempMessageStr = "";
        TempTextStr = "";
      }
    }
    if (byte(rstr[rs_offset]) > 127 || rs_offset < 21) rs_offset++;
    rs_offset++;
  }
  ScreenOnTimeActive = true;  // EXPERIMENT HERE
  ScreenOnTimeStart = 0;
}

void DigitsCenterPrint(int d, int x, int y) {
  if (d < 10 && d > -1) {
    display.setCursor(x + 8, y);
  } else if ((d > 9 && d < 100) || (d < 0 && d > -10)) {
    display.setCursor(x + 4, y);
  } else {
    display.setCursor(x, y);
  }
  display.print(d);
}

void ScanCheck() {
  int n = WiFi.scanComplete();
  if (n >= 0) {
    for (int i = 0; i < n; i++) {
      if (WiFi.SSID(i).startsWith(protoID)) {
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
          ProcessUCP31(WiFi.SSID(i), WiFi.RSSI(i));  // Don't forget to clear ScanStack on MLTimer tick
        }
      }
    }
    WiFi.scanDelete();
    WiFi.scanNetworks(true, false, 4);
  }
}

void ProcessUCP31(String ucpStr, int uRSSI) {  // Example: uF1i2575065_s3265-180_a3155400
  // syntax: pIDcVVdd(ee)MM_ where pID is protocol ID, c is command symbol, VV - ML var number, dd - threshold RSSI(without -), ee - optional eachdBm (c == 'i' only),
  // MM - modifier with variable length (can be form M to MMMMMM, etc.), _ - next command indicator/divider
  if (ucpStr.length() < 4) return;
  ucpStr.remove(0, 3);
  char comc = ucpStr[0]; // Command char
  if (comc == 'e') {
    ucpStr.remove(0, 1);
    AddEffect(ucpStr, ' ');
  } else {
    bool isLast = false;  // Is it last command to parse
    do {
      int mlvar = ucpStr.substring(1, 3).toInt(); // Target ML variable number
      int trrssi = ucpStr.substring(3, 5).toInt() * -1; // Threshold RSSI
      int eoci = ucpStr.indexOf(ssidDiv); // End of command index
      if (eoci == -1 || ucpStr.length() - eoci < 2) {
        eoci = ucpStr.length();
        isLast = true;
      }
      int edbm = 0; // Each dBm - for 'i' (incremental) command only
      int varmod = 0; // ML variable modifier
      if (comc == 'i') {
        varmod = ucpStr.substring(7, eoci).toInt();
        edbm = ucpStr.substring(5, 7).toInt();
      } else {
        varmod = ucpStr.substring(5, eoci).toInt();
      }
      ucpStr.remove(0, eoci + 1);
      if (uRSSI >= trrssi) { // RSSI above threshold
        if (comc == 's') { // Add more commands here if necessary
          MLP[mlvar] = varmod;
        } else if (comc == 'a') {
          MLP[mlvar] = MLP[mlvar] + varmod;
        } else if (comc == 'i') {  // Incremental anomaly
          if (varmod < 0) edbm = edbm * -1;
          //MLP[mlvar] = MLP[mlvar] + varmod + (uRSSI - trrssi) / edbm;
          MLP[mlvar] = MLP[mlvar] + varmod * abs(abs(trrssi) - abs(uRSSI)) / edbm;
        }
      }
      if (uRSSI + MLP[PERCEPTION] + MLP[MODPERCEPTION] >= trrssi && MLP[SHELTER] <= 0) { // Percepted
        if (mlvar == RADNOW) RadPflag = true;
        if (mlvar == CHEMBIO) ChemPflag = true;
        if (mlvar == PHYSICAL) PhyPflag = true;
        ScreenOnTimeActive = true;
        ScreenOnTimeStart = 0;
      }
    } while (!isLast);
  }
}

void ButtonCheck() {
  int btnState = digitalRead(BUTTON);
  if (btnState == LOW && !buttonWasPressed) { //press
    buttonWasPressed = true;
    LongClickTimeStart = 0;
    LongClickTimeActive = true;
    if (ShortClickTimeActive) ShortClickTimeStart = 0;
  } else if (btnState == HIGH && buttonWasPressed) {  //release
    buttonWasPressed = false;
    if (!LongClickTimeActive) { // long click detected
      ScreenOnTimeActive = true;
      ScreenOnTimeStart = 0;
      if (IndicationMode == 'Z' && !SuicideTimeActive) {
        SuicideTimeStart = 0;
        SuicideTimeActive = true;
        IndicationMode = 'z';
      } else {
        if (!TagTimeActive) TagTimerToProcess();
      }
    } else {
      if (ShortClickTimeActive) { // double click detected
        ShortClickTimeActive = false; // stop the timer so single click will not be detected in
        ShortClickTimeStart = 0;
        ScreenOnTimeActive = true;
        ScreenOnTimeStart = 0;
        if (IndicationMode != 'Z' && !TagTimeActive) TagTimerToRead();
      } else {
        ShortClickTimeActive = true;
        ShortClickTimeStart = 0;
      }
    }
  }
}

void TimersCheck() {
  if (ScreenOnTimeActive) {
    if (ScreenOnTimeStart == 0) ScreenOnTimeStart = millis();
    if (ScreenOnTimeout <= millis() - ScreenOnTimeStart) {
      ScreenOnTimeActive = false;
      ScreenOnTimeStart = 0;
      if (!(IndicationMode == 'R' || IndicationMode == 'S')) IndicationMode = 'A';
    }
  }
  if (LongClickTimeActive) {
    if (LongClickTimeStart == 0) LongClickTimeStart = millis();
    if (LongClickTimeout < millis() - LongClickTimeStart) {
      LongClickTimeActive = false;
      LongClickTimeStart = 0;
    }
  }
  if (ShortClickTimeActive) {
    if (ShortClickTimeStart == 0) ShortClickTimeStart = millis();
    if (ShortClickTimeout < millis() - ShortClickTimeStart) {
      ShortClickTimeActive = false;
      ShortClickTimeStart = 0;
      if (!buttonWasPressed) {  // Short click detected
        ScreenOnTimeStart = millis();
        if (!ScreenOnTimeActive) {
          ScreenOnTimeActive = true;  // If screen is off, first short click turns it on only, not switching
        } else {
          if (MLP[LIFE] > 0) SwitchScreens();
        }
      }
    }
  }
  if (MLTimeActive) {
    if (MLTimeStart == 0) MLTimeStart = millis();
    if (MLTimeout < millis() - MLTimeStart) {
      MLTimeStart = millis();
      if (MLP[SHELTER] > 0) {
        MLP[SHELTER]--;
        MLP[CHEMBIO] = 0;
        MLP[RADNOW] = 0;
        MLP[PHYSICAL] = 0;
        MLP[MODTEMP] = 0;
        RadPflag = false;
        ChemPflag = false;
        PhyPflag = false;
      } else if (MLP[SHELTER] < 0) MLP[SHELTER] = 0;  // Just in case
      MLCount();
      for (int i = 0; i < ScanStackSize; i++) { // Clear ScanStack
        ScanStack[i].bssid = "";
        ScanStack[i].ssid = "";
        ScanStack[i].rssi = -100;
      }
      MLP[CHEMBIO] = 0;
      MLP[RADNOW] = 0;
      MLP[PHYSICAL] = 0;
      MLP[MODTEMP] = 0;
      RadPflag = false;
      ChemPflag = false;
      PhyPflag = false;
      //InfoAP(false);
    }
  }
  if (TempIndTimeActive) {
    if (TempIndTimeStart == 0) TempIndTimeStart = millis();
    if (TempIndTimeout <= millis() - TempIndTimeStart) {
      TempIndTimeStart = 0;
      if (TempTextStr == "") {
        TempIndTimeActive = false;
        IndicationMode = PrevIndMode;
        TempMessageStr = "";
        TempTextStr = "";
        rs_offset = 0;
      }
    }
  }
  if (BackupTimeActive) {
    if (BackupTimeStart == 0) BackupTimeStart = millis();
    if (BackupTimeoutSec * 1000 < millis() - BackupTimeStart) {
      SaveMLData();
    }
  }
  if (ReviveTimeActive) {
    if (ReviveTimeStart == 0) ReviveTimeStart = millis();
    if (ReviveTimeoutMin * 60000 < millis() - ReviveTimeStart) {
      ReviveTimeStart = 0;
      ReviveTimeActive = false;
      // ClearEffects();  // Intentionally commented. Death will not clear your sins anymore
      for (int i = MODSTRENGTH; i <= MODLUCK; i++) {
        MLP[i] = 0;
      }
      MLP[FOOD] = MLP[STARTFOOD];
      MLP[WATER] = MLP[STARTWATER];
      MLP[RADDOSE] = 0;
      MLP[MAXLIFE] = MaxLifeFromSpecial();
      MLP[LIFE] = MLP[MAXLIFE];
      MLP[PLAYERTEMP] = 0;
      SaveMLData();
      IndicationMode = 'A';
      DeathCauseStr = "";
      MeatTaken = false;
      WasAliveFlag = true;
      digitalWrite(BUZZER, HIGH);
      delay(100);
      digitalWrite(BUZZER, LOW);
      ScreenOnTimeActive = true;
      ScreenOnTimeStart = 0;
    }
  }
  if (PerkTimeActive) {
    if (PerkTimeStart == 0) PerkTimeStart = millis();
    if (PerkTimeoutMin * 60000 < millis() - PerkTimeStart) {
      PerkTimeStart = 0;
      PerkTimeActive = false;
    }
  }
  if (TagTimeActive) {
    if (TagTimeStart == 0) TagTimeStart = millis();
    if (TagTimeout < millis() - TagTimeStart) {
      TagTimeStart = 0;
      TagTimeActive = false;
      if (NFCintent == 'R') {
        CheckTag();
      } else if (NFCintent == 'C') {
        ConsumeTag();
      } else if (NFCintent == 'P') {
        PerkTag();
      }
    }
  }
  if (SplashTimeActive) {
    if (SplashTimeStart == 0) SplashTimeStart = millis();
    if (SplashTimeout < millis() - SplashTimeStart) {
      SplashTimeStart = 0;
      SplashTimeActive = false;
      //InfoAP(true);
      ScanSTA();
      SplashTimeStart = 0;
      SplashTimeActive = false;
    }
  }
  if (SuicideTimeActive) {
    ScreenOnTimeActive = true;
    ScreenOnTimeStart = 0;
    if (SuicideTimeStart == 0) SuicideTimeStart = millis();
    if (SuicideTimeout <= millis() - SuicideTimeStart) {
      SuicideTimeActive = false;
      MLP[LIFE] = 0;
      DeathCauseStr = "убийства";
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

void TagTimerToRead() {
  TagTimeActive = true;
  TagTimeStart = 0;
  NFCintent = 'R';
  if (IndicationMode != 'M' && IndicationMode != 'T') PrevIndMode = IndicationMode;
  IndicationMode = 'T';
  pn532.SAMConfig();
  CheckNFCmodule();
}

void TagTimerToProcess() {
  TagTimeActive = true;
  TagTimeStart = 0;
  if (IndicationMode != 'M' && IndicationMode != 'T') PrevIndMode = IndicationMode;
  if (PrevIndMode == 'P' && MLP[PERK] != 3) { // Select perks which involve tag writing here. Maybe later delimit them by 0<n<100 for example and change Party King perk number to 101
    NFCintent = 'P';
  } else {
    NFCintent = 'C';
  }
  IndicationMode = 'T';
  pn532.SAMConfig();
  CheckNFCmodule();
}

void CheckNFCmodule() {
  int c = 0;
  while (!pn532.getFirmwareVersion()) {
    delay(10);
    c++;
    if (c > 4) {
      TagTimeActive = false;
      TagTimeStart = 0;
      TempIndTimeStart = 0;
      TempIndTimeActive = true;
      IndicationMode = 'M';
      TempMessageStr = "NFC FAIL";
      return;
    }
  }
}

void SwitchScreens() {
  pn532.powerDown(16, 0);
  TagTimeActive = false;
  TagTimeStart = 0;
  if (IndicationMode == 'A') {
    IndicationMode = 'B';
  } else if (IndicationMode == 'B') {
    IndicationMode = 'C';
  } else if (IndicationMode == 'C') {
    IndicationMode = 'D';
  } else if (IndicationMode == 'D') {
    if (MLP[PERK] > 0) {
      IndicationMode = 'P';
    } else {
      IndicationMode = 'Z';
    }
  } else if (IndicationMode == 'P') {
    IndicationMode = 'Z';
  } else if (IndicationMode == 'Z' || IndicationMode == 'z') {
    IndicationMode = 'A';
  } else if (IndicationMode == 'S') {
    IndicationMode = 'A';
  } else {
    IndicationMode = PrevIndMode;
  }
}

void SaveMLData() {
  BackupTimeStart = 0;
  //return; // DEBUG ONLY!!! REMOVE IN RELEASE VERSION!!!
  EEPROM.put(0, MLP);
  EEPROM.put(sizeof(MLP), Effects); // Write Effects right after MLP
  EEPROM.commit();
}

void LoadMLData() {
  EEPROM.get(0, MLP);
  EEPROM.get(sizeof(MLP), Effects);
}

// Preparate header format
// PROTO:FT3
// NAME:Test
// USES:3
// TEXT:Some text
// etc.

void CheckTag() {
  String prepname = "ПУСТО";
  bool readok = false;
  if (ReadNFCStr()) {
    readok = true;
    NFCStr.replace(String(char(13)), ""); // Remove CRs if any, only LFs should remain
    if (GetTagVal("PROTO") == protoID && GetTagVal("USES").toInt() > 0) {
      prepname = GetTagVal("NAME") + "\n" + GetTagVal("USES");
      TempTextStr = GetTagVal("TEXT");
      rs_offset = 0;
    }
  }
  TempIndTimeStart = 0;
  TempIndTimeActive = true;
  IndicationMode = 'M';
  if (readok) {
    TempMessageStr = prepname;
  } else {
    TempMessageStr = "ОШИБКА";
  }
  NFCStr = "";  // Just in case
  pn532.powerDown(16, 0);
}

void ConsumeTag() {
  String prepname = "ПУСТО";
  TempTextStr = "";
  rs_offset = 0;
  bool doneOk = false;
  char addTag = ' ';  // Adds empty tag by default
  if (ReadNFCStr()) {
    NFCStr.replace(String(char(13)), ""); // Remove CRs if any, only LFs should remain
    if (GetTagVal("PROTO") == protoID) {
      doneOk = true;
      int usesLeft = GetTagValDef("USES", "1").toInt();
      String estr = NFCStr.substring(NFCStr.indexOf("EFFECTS:") + 9); // Extracting effects string
      if (TagKeyExists("REVIVE")) {
        MLP[LIFE] = 0;
        WasAliveFlag = false;
        ReviveTimeStart = 0;
        ReviveTimeoutMin = GetTagValDef("REVIVE", "30").toInt();
        ReviveTimeActive = true;
        IndicationMode = 'R';
        SaveMLData();
        pn532.powerDown(16, 0);
        return;
      }
      if (TagKeyExists("RESET")) {
        ClearEffects();
        if (GetTagVal("RESET") == "SOFT") {
          for (int i = MODSTRENGTH; i <= MODLUCK; i++) {
            MLP[i] = 0;
          }
          MLP[FOOD] = MLP[STARTFOOD];
          MLP[WATER] = MLP[STARTWATER];
          MLP[RADDOSE] = 0;
          MLP[MAXLIFE] = MaxLifeFromSpecial();
          MLP[LIFE] = MLP[MAXLIFE];
          MLP[AMBIENTTEMP] = 0;
          MLP[PLAYERTEMP] = 0;
          MLP[ARMORSTATE] = MLP[MAXARMOR];
        } else {
          InitMLP();
        }
        DeathCauseStr = "";
        MeatTaken = false;
        WasAliveFlag = true;
        SaveMLData();
        IndicationMode = 'A'; // Disable rewriting tag later. TEST HERE
        pn532.powerDown(16, 0);
        return;
      }
      if (TagKeyExists("SCAN")) {
        IndicationMode = 'S';
        pn532.powerDown(16, 0);
        return;
      }
      // CONTINUE HERE, use ExtractEffects() to fill cannibal's NFC tag with player's effects
      if (GetTagVal("TYPE") == "CANN" && MLP[LIFE] <= 0 && MeatTaken == false) {  // Butcher's knife of cannibalism
        if (TagKeyExists("EFFECTS")) NFCStr = NFCStr.substring(0, NFCStr.indexOf("EFFECTS:") + 8);
        NFCStr += ExtractEffects();
        NFCStr += outEffDiv;
        NFCStr += "TAR";
        NFCStr += String(FOOD);
        NFCStr += " ADD";
        NFCStr += String(MLP[STRENGTH] * 5400);
        ModTagVal("USES", "1", true);
        if (WriteNFCStr()) {
          MeatTaken = true;
          TempIndTimeStart = 0;
          TempIndTimeActive = true;
          IndicationMode = 'M';
          TempMessageStr = "Дело\nсделано";
        } else {
          TempMessageStr = "ОШИБКА";
        }
        pn532.powerDown(16, 0);
        return;
      }
      if (GetTagVal("TYPE") == "CANW" && MLP[LIFE] <= 0 && MeatTaken == false) {  // Water knife of cannibalism
        if (TagKeyExists("EFFECTS")) NFCStr = NFCStr.substring(0, NFCStr.indexOf("EFFECTS:") + 8);
        NFCStr += ExtractEffects();
        NFCStr += outEffDiv;
        NFCStr += "TAR";
        NFCStr += String(WATER);
        NFCStr += " ADD";
        NFCStr += String(MLP[STRENGTH] * 9000);
        ModTagVal("USES", "1", true);
        if (WriteNFCStr()) {
          MeatTaken = true;
          TempIndTimeStart = 0;
          TempIndTimeActive = true;
          IndicationMode = 'M';
          TempMessageStr = "Дело\nсделано";
        } else {
          TempMessageStr = "ОШИБКА";
        }
        pn532.powerDown(16, 0);
        return;
      }
      if (usesLeft > 0 && MLP[LIFE] > 0) {  // All other preparates are for alive persons only
        if (TagKeyExists("ONLY")) {
          if (Interprete(GetTagVal("ONLY")).toInt() <= 0) {
            TempIndTimeStart = 0;
            TempIndTimeActive = true;
            IndicationMode = 'M';
            TempMessageStr = "Не вышло";
            pn532.powerDown(16, 0);
            return;
          }
        }
        if (GetTagVal("PERK") == "ORA" || GetTagVal("PERK") == "ENG" || GetTagVal("PERK") == "DOC") {  // Should be processed with PerkTag
          TempIndTimeStart = 0;
          TempIndTimeActive = true;
          IndicationMode = 'M';
          TempMessageStr = "Не вышло";
          pn532.powerDown(16, 0);
          return;
        }
        if (GetTagVal("TYPE") == "HOLO") {  // Holodisk can't be consumed, just display text
          TempIndTimeStart = 0;
          TempIndTimeActive = true;
          IndicationMode = 'M';
          TempMessageStr = GetTagValDef("NAME", "Noname");
          TempTextStr = GetTagVal("TEXT");
          rs_offset = 0;
          pn532.powerDown(16, 0);
          return;
        }
        if (GetTagVal("TYPE") == "ANA") { // Medical analysis, show effect IDs
          ModTagVal("USES", String(usesLeft - 1), true);
          if (WriteNFCStr()) {
            TempIndTimeStart = 0;
            TempIndTimeActive = true;
            IndicationMode = 'M';
            TempMessageStr = "Результат";
            TempTextStr = GetEffectIDs();
            rs_offset = 0;
          } else {
            TempMessageStr = "ОШИБКА";
          }
          pn532.powerDown(16, 0);
          return;
        }
        if (TagKeyExists("PERKNOW")) {
          PerkTimeStart = millis() + PerkTimeoutMin * 60000;  // Recharge perk immediately
        }
        bool splashHere = false;  // Splash instrument check
        if (TagKeyExists("SPLASH")) splashHere = true;
        ModTagVal("USES", String(usesLeft - 1), true);
        if (WriteNFCStr()) {  // If write was successful, apply effects from original
          prepname = GetTagValDef("NAME", "Noname");
          if (estr.length() > 0) {
            // Attemting to add effects
            int divIdx = -1;
            int stSym = 0;
            while (estr.indexOf(outEffDiv, stSym) > -1) {
              divIdx = estr.indexOf(outEffDiv, stSym);
              AddEffect(estr.substring(stSym, divIdx), addTag);
              stSym = divIdx + 1;
            }
            AddEffect(estr.substring(stSym, estr.length()), addTag);
          }
          if (splashHere) SplashSSID(GetTagValDef("SPLASH", "SPLASH"), GetTagValDef("SPLASHPOW", "20")); // Splash only after tag is rewritten
        }
      }
    }
  }
  TempIndTimeStart = 0;
  TempIndTimeActive = true;
  IndicationMode = 'M';
  if (doneOk) {
    TempMessageStr = prepname;
    if (prepname != "ПУСТО") {
      TempMessageStr += "\nпринято";
      SaveMLData();
    }
  } else {
    TempMessageStr = "ОШИБКА";
  }
  pn532.powerDown(16, 0);
}

void PerkTag() {
  if (MLP[LIFE] == 0) {
    pn532.powerDown(16, 0);
    return; // Tag perks are not for dead ones
  }
  if (PerkTimeActive) {
    TempIndTimeStart = 0;
    TempIndTimeActive = true;
    if (IndicationMode != 'M' && IndicationMode != 'T') PrevIndMode = IndicationMode;
    IndicationMode = 'M';
    TempMessageStr = "Перк\nне готов";
    pn532.powerDown(16, 0);
    return;
  }
  bool doneOk = false;
  bool perked = false;
  if (ReadNFCStr()) {
    NFCStr.replace(String(char(13)), ""); // Remove CRs if any, only LFs should remain
    if (GetTagVal("PROTO") == protoID) {
      doneOk = true;
      int usesLeft = GetTagValDef("USES", "1").toInt();
      //String estr = NFCStr.substring(NFCStr.indexOf("EFFECTS:") + 9); // Extracting effects string
      if (MLP[PERK] == 1 && usesLeft > 0 && GetTagValDef("PERK", "") == "DOC") { // Doctor
        ModTagVal("USES", String(usesLeft - 1), true);
        perked = true;
      } else if (MLP[PERK] == 2 && usesLeft > 0 && GetTagValDef("PERK", "") == "SUR") { // Survivalist
        usesLeft = min(usesLeft, MLP[ENDURANCE] + MLP[MODENDURANCE] - 6);
        if (usesLeft < 0) usesLeft = 0;
        ModTagVal("USES", String(usesLeft), true);
        NFCStr = NFCStr + outEffDiv + "TAR25 SET0";
        ModTagVal("TEXT", "Очищено от радиации", true);
        perked = true;
      } else if (MLP[PERK] == 4 && usesLeft > 0 && GetTagValDef("PERK", "") == "ORA") { // Orator
        ModTagVal("USES", String(usesLeft - 1), true);
        perked = true;
      } else if (MLP[PERK] == 5 && usesLeft > 0 && GetTagValDef("PERK", "") == "ENG") { // Engineer
        ModTagVal("USES", String(usesLeft - 1), true);
        perked = true;
      }
      if (perked) perked = WriteNFCStr(); // Now this flag can be reused
    }
  }
  TempIndTimeStart = 0;
  TempIndTimeActive = true;
  IndicationMode = 'M';
  if (doneOk) {
    if (perked) {
      if (MLP[PERK] == 1) {
        int docStats = MLP[PERCEPTION] + MLP[MODPERCEPTION] + MLP[INTELLECT] + MLP[MODINTELLECT] + MLP[AGILITY] + MLP[MODAGILITY];
        if (docStats >= 21) {
          int modTime = map(docStats, 21, 30, 4, 10) * 60;
          SplashSSID(GetTagValDef("SPLASH", "SPLASH") + " REP" + String(modTime), GetTagValDef("SPLASHPOW", "20"));
          TempMessageStr = "Успешно";
        } else {
          TempMessageStr = "Не вышло";
        }
      } else if (MLP[PERK] == 4) {
        int modTime = (MLP[CHARISMA] + MLP[MODCHARISMA] - 6) * 600;
        if (modTime > 0) {
          SplashSSID(GetTagValDef("SPLASH", "SPLASH") + " REP" + String(modTime), GetTagValDef("SPLASHPOW", "20"));
          TempMessageStr = "Успешно";
        } else {
          TempMessageStr = "Не вышло";
        }
      } else if (MLP[PERK] == 5) {
        int modTime = (MLP[INTELLECT] - 6) * 3;
        if (modTime > 0) {
          SplashSSID(GetTagValDef("SPLASH", protoID) + "K" + String(modTime), GetTagValDef("SPLASHPOW", "20"));
          TempMessageStr = "Успешно";
        } else {
          TempMessageStr = "Не вышло";
        }
      }
      PerkTimeStart = 0;
      PerkTimeActive = true;
    } else {
      TempMessageStr = "Не вышло";
    }
  } else {
    TempMessageStr = "ОШИБКА";
  }
  pn532.powerDown(16, 0);
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

String GetEffectIDs() {
  String resStr = "";
  for (int i = 0; i < EffectsSize; i++) {
    if (Effects[i].Identifier != ' ' && Effects[i].Identifier != '0') resStr = resStr + String(Effects[i].Identifier);
  }
  return resStr;
}

String ExtractEffects() {
  String resStr = "";
  for (int i = 0; i < EffectsSize; i++) {
    if (Effects[i].Identifier != ' ' && Effects[i].Identifier != '0') {
      resStr += outEffDiv;
      resStr += "TAR";
      resStr += String(Effects[i].Target);
      resStr += " ";
      if (Effects[i].Operation == 'A') {
        resStr += "ADD";
      } else if (Effects[i].Operation == 'S') {
        resStr += "SET";
      }
      resStr += String(Effects[i].Modifier);
      resStr += " REP";
      resStr += String(Effects[i].Repeats);
      if (Effects[i].After > 0) {
        resStr += " AFT";
        resStr += String(Effects[i].After);
      }
      resStr += " EID";
      resStr += Effects[i].Identifier;
      if (Effects[i].Interval > 0) {
        resStr += " INT";
        resStr += String(Effects[i].Interval);
      }
      if (Effects[i].RemoveIdent != ' ') {
        resStr += " REM";
        resStr += Effects[i].RemoveIdent;
      }
      resStr += " CONfQTY";
      resStr += Effects[i].Identifier;
      resStr += "=0";
    }
  }
  resStr += outEffDiv;
  resStr += "TAR";
  resStr += String(RADDOSE);
  resStr += " ADD";
  resStr += String(MLP[RADDOSE]);
  return resStr;
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

/*
  сhar Identifier = ' ';  // Effect identifier
  char RemoveIdent = ' '  // One effect with this identifier will be removed once this effect fires
  int Repeats = 1;  // Repeats left
  int Interval = 0; // Interval in ML counts
  int After = 0; // To next repeat. Set to 0 for immediate effect
  byte Target = 0;    // Index of target parameter in MLParams
  char Operation = 'A'; // Add or Set the modifier value
  int Modifier = 0; // To be applied to Target. Modifier is calculated after effect string is parsed
  char Tag = ' '; // Additional tag, can be used to identify source preparate or artefact slot
*/
// EIDX REMZ REP5 INT8 AFT10 TAR12 SET90

void AddEffect(String effstr, char newTag) {
  EffectEntry eff;
  int divIdx = -1;
  int stSym = 0;
  bool EoE = false; // End of Effect flag
  while (!EoE) {
    divIdx = effstr.indexOf(inEffDiv, stSym);
    String epart = "";
    if (divIdx > -1) {
      epart = effstr.substring(stSym, divIdx);
    } else {
      epart = effstr.substring(stSym, effstr.length());
      EoE = true;
    }
    stSym = divIdx + 1;
    String opType = epart.substring(0, 3);
    String opArg = epart.substring(3, epart.length());
    if (opType == "TAR") {
      eff.Target = byte(opArg.toInt());
    } else if (opType == "ADD") {
      eff.Operation = 'A';
      eff.Modifier = Interprete(opArg).toInt();
    } else if (opType == "SET") {
      eff.Operation = 'S';
      eff.Modifier = Interprete(opArg).toInt();
    } else if (opType == "EID") {
      eff.Identifier = opArg.charAt(0);
    } else if (opType == "REM") {
      eff.RemoveIdent = opArg.charAt(0);
    } else if (opType == "REP") {
      eff.Repeats = opArg.toInt();
    } else if (opType == "INT") {
      eff.Interval = opArg.toInt();
    } else if (opType == "AFT") {
      eff.After = opArg.toInt();
    } else if (opType == "CON") {
      if (Interprete(opArg).toInt() <= 0) return; // Condition solved as false
    }
    eff.Tag = newTag;
  }
  if (eff.Target == 0 && eff.RemoveIdent == ' ') return;  // Effect is useless
  if (eff.Identifier == ' ') eff.Identifier = '0';  // Default EID, set for not removing effect as empty one in CalcEffects()
  for (int i = 0; i < EffectsSize; i++) { // Passed all checks, adding effect
    if (Effects[i].Identifier == ' ') {
      Effects[i] = eff;
      return;
    }
  }
}

/*
  сhar Identifier = ' ';  // Effect identifier
  char RemoveIdent = ' '  // One effect with this identifier will be removed once this effect fires
  int Repeats = 1;  // Repeats left
  int Interval = 0; // Interval in ML counts
  int After = 0; // To next repeat. Set to 0 for immediate effect
  byte Target = 0;    // Index of target parameter in MLParams
  char Operation = 'A'; // Add or Set the modifier value
  int Modifier = 0; // To be applied to Target. Modifier is calculated after effect string is parsed
  char Tag = ' '; // Additional tag, can be used to identify source preparate or artefact slot
*/

void CalcEffects() {
  for (int i = 0; i < EffectsSize; i++) {
    if (Effects[i].Identifier != ' ') { // Effect is not empty, do something with it
      if (Effects[i].Repeats > 0 || Effects[i].Repeats < -9) { // There is at least one repeat of this effect left or it is set to infinite repeats
        if (Effects[i].After <= 0) {
          //Process effect here
          if (Effects[i].Target != 0) { // Apply modifier
            if (Effects[i].Operation == 'A') {
              MLP[Effects[i].Target] = MLP[Effects[i].Target] + Effects[i].Modifier;  // Apply modifier to target as addition
            } else if (Effects[i].Operation == 'S') {
              MLP[Effects[i].Target] = Effects[i].Modifier; // Apply modifier to target as new value
            }
          }
          if (Effects[i].RemoveIdent != ' ') {  // This effect intends to remove other one
            for (int j = 0; j < EffectsSize; j++) {
              if (Effects[j].Identifier == Effects[i].RemoveIdent) { // If target effect Identifier matches current's RemoveIdent
                Effects[j].Repeats = 0;  // Deactivate target effect
                break; // But only one of them
              }
            }
          }
          Effects[i].After = Effects[i].Interval;
          Effects[i].Repeats--;
        } else {
          Effects[i].After--;
        }
      } else {  // Effect expired. Presuming defragmentation of Effects array is not required.
        Effects[i].Identifier = ' ';
        Effects[i].RemoveIdent = ' ';
        Effects[i].Repeats = 0;
        Effects[i].Interval = 0;
        Effects[i].After = 0;
        Effects[i].Target = 0;
        Effects[i].Operation = 'A';
        Effects[i].Modifier = 0;
        Effects[i].Tag = ' ';
      }
    }
  }
}

String Interprete(String interStr) {
  unsigned long startTime = millis();
  //Split input to array of strings
  String InputArr[IOArrSize];
  if (interStr.length() == 0) return "0";
  int ai = 0; // array index
  for (int i = 0; i < interStr.length(); i++) {
    if (interStr.charAt(i) != ' ') {
      if (InputArr[ai] == "") {
        InputArr[ai] += interStr.charAt(i);
        if (interStr.charAt(i) == '(' || interStr.charAt(i) == ')') ai++;
      } else {
        if (isAlphaNumeric(interStr.charAt(i))) {
          if (InputArr[ai] == "-") {  //CHECK HERE
            if (ai > 0) {
              if (isAlphaNumeric(InputArr[ai - 1].charAt(InputArr[ai - 1].length() - 1)) || InputArr[ai - 1] == ")") ai++;
            }
          } else {
            if (!isAlphaNumeric(InputArr[ai].charAt(InputArr[ai].length() - 1))) ai++;
          }
          InputArr[ai] += interStr.charAt(i);
        } else {
          if (isAlphaNumeric(InputArr[ai].charAt(InputArr[ai].length() - 1)) || (interStr.charAt(i) == '(' || interStr.charAt(i) == ')' || interStr.charAt(i) == '-')) ai++;
          InputArr[ai] += interStr.charAt(i);
          if (interStr.charAt(i) == '(' || interStr.charAt(i) == ')') ai++;
        }
      }
    }
  }
  //End splitting
  //Converting to Reverse Polish Notation
  String Opstack[OpstackSize];
  String OutputArr[IOArrSize];
  for (int i = 0; i < IOArrSize; i++) {
    if (InputArr[i] == "") break;
    if (isAlphaNumeric(InputArr[i].charAt(InputArr[i].length() - 1))) {  // Operand detected. Probably later change to another check
      PutToArray(InputArr[i], OutputArr, IOArrSize); // Add it to the end of OutputArr
    } else {  // Presumably operator detected
      if (InputArr[i] == "(") {
        PutToArray(InputArr[i], Opstack, OpstackSize);
      } else if (InputArr[i] == ")") {
        PushFromToArr(Opstack, OpstackSize, OutputArr, IOArrSize, 2);
      } else {
        PushFromToArr(Opstack, OpstackSize, OutputArr, IOArrSize, OpPriority(InputArr[i]));
        PutToArray(InputArr[i], Opstack, OpstackSize);
      }
    }
  }
  for (int i = OpstackSize - 1; i > -1; i--) { // Move remaining operators from Opstack to OutputArr
    if (Opstack[i] != "") PutToArray(Opstack[i], OutputArr, IOArrSize);
  }
  //Conversion to RPN complete, result stored in OutputArr
  //Calculating
  String CalcStack[OpstackSize];
  for (int i = 0; i < IOArrSize; i++) {
    if (OutputArr[i] == "") break;
    if (isAlphaNumeric(OutputArr[i].charAt(OutputArr[i].length() - 1))) {  // Operand detected
      if (OutputArr[i].startsWith("v")) {
        OutputArr[i] = String(MLP[OutputArr[i].substring(1).toInt()]);  // Var targeter - get value
      } else if (OutputArr[i].startsWith("f")) {  // Functions section. Functions are simplified and can't have expression as arguments due to memory limitation
        if (OutputArr[i].substring(1, 4) == "QTY") {  // Returns concentration of effects with certain identifier. Example: fQTY0 returns empty effects
          char tarID = OutputArr[i].charAt(4);
          int conc = 0;
          for (int k = 0; k < EffectsSize; k++) {
            if (Effects[k].Identifier == tarID) conc++;
          }
          OutputArr[i] = String(conc);
        } else if (OutputArr[i].substring(1, 4) == "DEL") { // Same as fQTY but removes target effects
          char tarID = OutputArr[i].charAt(4);
          int conc = 0;
          EffectEntry emptyEff;
          for (int k = 0; k < EffectsSize; k++) {
            if (Effects[k].Identifier == tarID) {
              conc++;
              Effects[k] = emptyEff;
            }
          }
          OutputArr[i] = String(conc);
        } else if (OutputArr[i].substring(1, 4) == "RND") {
          int rang = OutputArr[i].substring(4).toInt();
          randomSeed(millis());
          OutputArr[i] = String(random(rang));
        }
      }
      PutToArray(OutputArr[i], CalcStack, OpstackSize);
    } else {
      int firstFreeIdx = -1;
      int intRes = 0;
      for (int j = 0; j < OpstackSize; j++) { // Find first free index in CalcStack
        if (CalcStack[j] == "") {
          firstFreeIdx = j;
          break;
        }
      }
      if (firstFreeIdx - 2 < 0) { // Negative
        if (OutputArr[i] == "-" || OutputArr[i] == "!") {
          intRes = CalcStack[firstFreeIdx - 1].toInt() * -1;
          CalcStack[firstFreeIdx - 1] = "";
        } else {
          //Serial.println("Calc error: not enough operands in CalcStack");
          return "0";
        }
      } else {
        int argA = CalcStack[firstFreeIdx - 2].toInt();
        int argB = CalcStack[firstFreeIdx - 1].toInt();
        CalcStack[firstFreeIdx - 2] = "";
        CalcStack[firstFreeIdx - 1] = "";
        if (OutputArr[i] == "+") {
          intRes = argA + argB;
        } else if (OutputArr[i] == "-") {
          intRes = argA - argB;
        } else if (OutputArr[i] == "*") {
          intRes = argA * argB;
        } else if (OutputArr[i] == "/") {
          intRes = argA / argB;
        } else if (OutputArr[i] == "^") {
          intRes = argA;
          for (int p = 1; p < argB; ++p) intRes *= argA;  // pow() function is not suitable for integers
        } else if (OutputArr[i] == ">") {
          if (argA > argB) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == "<") {
          if (argA < argB) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == "=") {
          if (argA == argB) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == ">=") {
          if (argA >= argB) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == "<=") {
          if (argA <= argB) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == "!=" || OutputArr[i] == "<>") {
          if (argA != argB) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == "&") {
          if (argA > 0 && argB > 0) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        } else if (OutputArr[i] == "|") {
          if (argA > 0 || argB > 0) {
            intRes = 1;
          } else {
            intRes = 0;
          }
        }
      }
      PutToArray(String(intRes), CalcStack, OpstackSize);
    }
  }
  int firstFreeIdx = -1;
  for (int j = 0; j < OpstackSize; j++) { // Find first free index in CalcStack
    if (CalcStack[j] == "") {
      firstFreeIdx = j;
      break;
    }
  }
  if (firstFreeIdx != 1) {
    // Serial.println("Calc error: more than one value in CalcStack after calculation");
    return "0";
  } else {
    // Serial.print("Calculation result is: ");
    // Serial.println(CalcStack[0]);
    return CalcStack[0];
  }
}

void PushFromToArr(String FromArray[], int faSize, String ToArray[], int taSize, int eqPri) {
  for (int k = faSize - 1; k > -1; k--) {
    if (FromArray[k] != "") {
      if (OpPriority(FromArray[k]) >= eqPri) {
        PutToArray(FromArray[k], ToArray, taSize);
        FromArray[k] = "";
      } else {
        if (FromArray[k] == "(") FromArray[k] = "";
        break;
      }
    }
  }
}

int OpPriority(String opStr) {
  if (opStr == "^") {
    return 8;
  } else if (opStr == "*" || opStr == "/") {
    return 7;
  } else if (opStr == "-") {
    return 6;
  } else if (opStr == "+") {
    return 5;
  } else if (opStr == "<" || opStr == ">" || opStr == "=" || opStr == ">=" || opStr == "<=") {
    return 4;
  } else if (opStr == "!") {
    return 3;
  } else if (opStr == "&") {
    return 2;
  } else if (opStr == "|") {
    return 1;
  } else if (opStr == "(") {
    return 0;
  }
}

void PutToArray(String toPut, String ToArray[], int ArraySize) {
  for (int j = 0; j < ArraySize; j++) {  // Add it to the end of OutputArr
    if (ToArray[j] == "") {
      ToArray[j] = toPut;
      break;
    }
  }
}

String TimeFormatSec (int sec, bool showHr, bool showSec) {
  int mn = sec / 60;
  int hr = mn / 60;
  mn = mn - hr * 60;
  int sc = sec - mn * 60 - hr * 3600;
  String res = "";
  if (showHr) {
    if (hr <= 0) {
      res += "00";
    } else if (hr < 10) {
      res += "0";
      res += String(hr);
    } else {
      res += String(hr);
    }
    res += ":";
  }
  if (!showHr && mn > 99) {
    res += "++";
  } else if (mn <= 0) {
    res += "00";
  } else if (mn < 10) {
    res += "0";
    res += String(mn);
  } else {
    res += String(mn);
  }
  if (showSec) {
    res += ":";
    if (sc <= 0) {
      res += "00";
    } else if (sc < 10) {
      res += "0";
      res += String(sc);
    } else {
      res += String(sc);
    }
  }
  return res;
}

void ClearEffects() {
  for (int i = 0; i < EffectsSize; i++) {
    Effects[i].Identifier = ' ';
    Effects[i].RemoveIdent = ' ';
    Effects[i].Repeats = 0;
    Effects[i].Interval = 0;
    Effects[i].After = 0;
    Effects[i].Target = 0;
    Effects[i].Operation = 'A';
    Effects[i].Modifier = 0;
    Effects[i].Tag = ' ';
  }
}

void InitMLP() {
  MLP[0] = 18;  // Data correctness signature
  MLP[STRENGTH] = 5;
  MLP[PERCEPTION] = 5;
  MLP[ENDURANCE] = 5;
  MLP[CHARISMA] = 5;
  MLP[INTELLECT] = 5;
  MLP[AGILITY] = 5;
  MLP[LUCK] = 5;
  for (int i = MODSTRENGTH; i <= MODLUCK; i++) {  // Initialize modifiers to zeros
    MLP[i] = 0;
  }
  MLP[LIFE] = MaxLifeFromSpecial();
  MLP[MAXLIFE] = MaxLifeFromSpecial();
  MLP[FOOD] = 16200;
  MLP[WATER] = 27000;
  MLP[FOODPERCYC] = 3;
  MLP[WATERPERCYC] = 5;
  MLP[RADRESIST] = 0;
  MLP[CHEMBIORESIST] = 0;
  MLP[PHYSICALRESIST] = 0;
  MLP[RADDOSE] = 0;
  MLP[RADNOW] = 0;
  MLP[CHEMBIO] = 0;
  MLP[PHYSICAL] = 0;
  MLP[PERK] = 0;
  MLP[PLAYERID] = 0;
  MLP[STARTFOOD] = 16200;
  MLP[STARTWATER] = 27000;
  MLP[RACE] = 0;
  MLP[AMBIENTTEMP] = 0;
  MLP[MODTEMP] = 0;
  MLP[PLAYERTEMP] = 0;
  MLP[SHELTER] = 0;
  MLP[ARMORSTATE] = 0;
  MLP[MAXARMOR] = 0;
  MLP[ARADRESIST] = 0;
  MLP[APHYSRESIST] = 0;
  MLP[ACHEMBIORESIST] = 0;
  MLP[ATHERMOINSULATION] = 0;
}

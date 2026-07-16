#include <PN532_HSU.h>
#include <PN532.h>
#include <NfcAdapter.h>
#define DICTSIZE 27
const String Dict[DICTSIZE] = { "PROTO:", "NAME:", "TYPE:", "TEXT:", "USES:", "EFFECTS:", "REVIVE:", "RESET:", "SPLASH:", "SPLASHSSID:", "SPLASHPOW:",
                                "SCAN:", "EFFECTS:", "TAR", "ADD", "SET", "EID", "REM", "REP", "INT", "AFT", "TAG", "CON", "fRND", "fQTY", "fDEL", "  "
                              };
const String EncKeyStr = "a2oq758v9aotys4ao38yvnba9o283r232xo93mv";

PN532_HSU pn532hsu(Serial1);
PN532 pn532(pn532hsu);
NfcAdapter nfc = NfcAdapter(pn532hsu);

// CLI interface variables
char inputChar = 13;        // Char for input char
String inputStr = "";       // String for input text
boolean newCommand = false; // Flag for detecting CR (Enter)
String prompt = ">";        // Command prompt. It is variable for ability to change prompt during operation

void setup() {
  Serial.begin(115200);
  Serial1.begin(115200);
  nfc.begin();
  Serial.println("System online");
  Serial.print(prompt);
}

void loop() {
  LocalSerialCLI();
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
    Serial.print(prompt); // Display command prompt again
  }
}

void ProcessCommands() {
  if (inputStr.substring(0, 4) == "test") {
    TestNFCchip();
  } else if (inputStr.substring(0, 4) == "help") {
    Serial.println("test - test PN532 NFC chip");
    Serial.println("nfcf - format NFC tag");
    Serial.println("nfce - erase NFC tag");
    Serial.println("nfcr - read NFC tag");
    Serial.println("nfcw string_to_write - write a string to NFC tag");
  } else if (inputStr.substring(0, 4) == "nfce") {
    if (EraseTag()) {
      Serial.println("Erased Ok");
    } else {
      Serial.println("ERASE ERROR");
    }
  } else if (inputStr.substring(0, 4) == "nfcf") {
    if (FormatTag()) {
      Serial.println("Format Ok");
    } else {
      Serial.println("FORMAT ERROR");
    }
  } else if (inputStr.substring(0, 4) == "nfcw") {
    inputStr.remove(0, 5);
    if (WriteNFCencoded(inputStr)) {
      Serial.println("Written Ok");
    } else {
      Serial.println("WRITE ERROR");
    }
  } else if (inputStr.substring(0, 4) == "nfcr") {
    ReadNFCencoded();
  } else {
    Serial.print("Command not recognized: ");
    Serial.println(inputStr);
  }
}

void TestNFCchip () {
  Serial.println("Checking NFC module...");
  uint32_t versiondata = pn532.getFirmwareVersion();
  Serial.println(versiondata);
  if (versiondata) {
    Serial.print("Found chip PN5"); Serial.println((versiondata >> 24) & 0xFF, HEX);
    Serial.print("Firmware ver. "); Serial.print((versiondata >> 16) & 0xFF, DEC);
    Serial.print('.'); Serial.println((versiondata >> 8) & 0xFF, DEC);
  } else {
    Serial.println("Didn't find PN53x board");
  }
}

bool EraseTag() {
  if (nfc.tagPresent()) {
    bool success = nfc.erase();
    return success;
  } else {
    return false;
  }
}

bool FormatTag() {
  if (nfc.tagPresent()) {
    bool success = nfc.format();
    return success;
  } else {
    return false;
  }
}

bool WriteNFCencoded(String inStr) {
  if (EraseTag() == false) return false;  // Erasing
  NfcTag tag = nfc.read();  // Reading UID
  unsigned int uidLength = tag.getUidLength();
  byte uid[uidLength];
  tag.getUid(uid, uidLength);
  // Compression
  for (int i = 0; i < DICTSIZE; i++) {
    inStr.replace(Dict[i], String(char(OrderToNUchar(i))));
  }
  // Encryption
  int l = 0;   // Preparing key
  byte EncKeyArr[EncKeyStr.length()];
  for (int k = 0; k < EncKeyStr.length(); k++) {
    EncKeyArr[k] = ((uid[l] + k + 4) ^ byte(EncKeyStr[k]));
    l++;
    if (l > uidLength - 1) l = 0;
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
  return nfc.write(message);
}

void ReadNFCencoded() {
  if (nfc.tagPresent()) {
    NfcTag tag = nfc.read();
    unsigned int uidLength = tag.getUidLength();
    byte uid[uidLength];
    tag.getUid(uid, uidLength);
    if (tag.hasNdefMessage()) {
      NdefMessage message = tag.getNdefMessage();
      int recordCount = message.getRecordCount();
      for (int i = 0; i < recordCount; i++) {
        NdefRecord record = message.getRecord(i);
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
        String decStr = "";   // Decrypting
        int j = 0;
        for (int c = 0; c < payloadLength; c++) {
          byte decByte = (payload[c] ^ (EncKeyArr[j]));
          if (IsNUchar(decByte)) {
            decStr += Dict[NUcharToOrder(decByte)];
          } else {
            decStr += char(decByte);
          }
          j++;
          if (j > EncKeyStr.length() - 1) j = 0;
        }
        Serial.print("Read and decrypted ");
        Serial.print(payloadLength);
        Serial.println(" bytes:");
        Serial.println(decStr);
      }
    }
  } else {
    Serial.println("READ ERROR");
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

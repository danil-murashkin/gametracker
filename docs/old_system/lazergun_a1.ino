#include <SoftwareSerial.h>
#include <DFPlayer_Mini_Mp3.h>
#define BUTTON_PIN A7
#define BUSY_PIN A6
bool ButtonPressed = false;
SoftwareSerial MP3Serial(2, 3); // Controller's RX, TX
int LazerPins[15] = {4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19}; // D4-D12, A0-A5
int CurrentLazerPin = 14;

//Timers
unsigned int ShotTimeout = 100;
bool ShotTimeActive = false;
unsigned long ShotTimeStart = 0;

void setup() {
  pinMode(BUTTON_PIN, INPUT);
  pinMode(BUSY_PIN, INPUT);
  for (int i = 4; i < 13; i ++) {
    pinMode(i, OUTPUT);
  }
  for (int i = A0; i < A6; i ++) {
    pinMode(i, OUTPUT);
  }
  MP3Serial.begin(9600);
  Serial.begin(9600);
  mp3_set_serial(MP3Serial);    // set softwareSerial for DFPlayer-mini mp3 module
  delay(1);                     // delay 1ms to set volume
  mp3_set_volume(30);           // value 0~30
  /*
    for (int i = 4; i < 13; i ++) { //Shot sequence needs to be 1-6-11, 2-7-12, etc.
      digitalWrite(i, HIGH);
      delay(200);
      digitalWrite(i, LOW);
    }
    for (int i = A0; i < A6; i ++) {
      digitalWrite(i, HIGH);
      delay(200);
      digitalWrite(i, LOW);
    }
  */
  Serial.begin(115200);
  Serial.println("Loaded");
}

void loop() {
  ButtonCheck();
  TimersCheck();
  //BusyCheck();
}

/*
void BusyCheck() {
  if (analogRead(BUSY_PIN) > 300 && ShotTimeActive) {
    mp3_play(2);
    delay(40);
  }
}
*/

void ButtonCheck() {
  int res = analogRead(BUTTON_PIN);
  if (res < 1000 && !ButtonPressed) { // Take into account power drop when MP3 plays
    //Serial.println(res);
    delay(67);  // Protection
    res = analogRead(BUTTON_PIN);
    //Serial.println(res);
    if (res < 1000) {  // Really pressed
      ButtonPressed = true;
      if (res < 50) {
        Serial.println("Button 1 click");
        mp3_stop();
        delay(40);
        mp3_play(2);
        delay(40);
        ShotTimeActive = true;
      } else {
        Serial.println("Button 2 click");
        randomSeed(millis());
        mp3_play(random(4, 7));
      }
    }
  } else if (res > 1000 && ButtonPressed) {
    ButtonPressed = false;
    Serial.println("Button released");
    if (ShotTimeActive) {
      ShotTimeActive = false;
      for (int i = 0; i < 15; i ++) {
        digitalWrite(LazerPins[i], LOW);
      }
      mp3_play(3);
    }
  }
}

void TimersCheck() {
  if (ShotTimeActive) {
    if (ShotTimeStart == 0) ShotTimeStart = millis();
    if (ShotTimeout <= (millis() - ShotTimeStart)) {
      //ShotTimeActive = false;
      ShotTimeStart = 0;
      int secLazPin = CurrentLazerPin + 5;
      if (secLazPin > 14) secLazPin = secLazPin - 15;
      int thiLazPin = CurrentLazerPin + 10;
      if (thiLazPin > 14) thiLazPin = thiLazPin - 15;
      digitalWrite(LazerPins[CurrentLazerPin], LOW);
      digitalWrite(LazerPins[secLazPin], LOW);
      digitalWrite(LazerPins[thiLazPin], LOW);
      CurrentLazerPin++;
      secLazPin++;
      if (secLazPin > 14) secLazPin = secLazPin - 15;
      thiLazPin++;
      if (thiLazPin > 14) thiLazPin = thiLazPin - 15;
      if (CurrentLazerPin > 14) CurrentLazerPin = 0;
      digitalWrite(LazerPins[CurrentLazerPin], HIGH);
      digitalWrite(LazerPins[secLazPin], HIGH);
      digitalWrite(LazerPins[thiLazPin], HIGH);
      /*      Serial.print("1st: ");
            Serial.println(CurrentLazerPin);
            Serial.print("2nd: ");
            Serial.println(secLazPin);
            Serial.print("3rd: ");
            Serial.println(thiLazPin); */
    }
  }
}

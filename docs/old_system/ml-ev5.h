#ifndef ml-ev5_h
#define ml-ev5_h

#include "Arduino.h"

class EffectEntry	// To build effect entries array
{
        public:
        char Identifier = ' ';  // Effect identifier
		char RemoveIdent = ' ';	// Effects with same identifier will be removed with this one once effect fires
        int Repeats = 1;  // Repeats left. Set to -10 for infinite repeats
		int Interval = 0; // Interval in ML counts
        int After = 0; // To next repeat. Set to 0 for immediate effect
        byte Target = 0;    // Index of target parameter in MLParams
		char Operation = 'A'; // Add or Set the modifier value
		int Modifier = 0;	// To be applied to Target
		char Tag = ' '; // Additional tag, can be used to identify source preparate or artefact slot

        private:
               // Currently nothing is here
};

class ScanEntry // For scan array
{
        public:
            String ssid = "";
            String bssid = "";
            int rssi = -100;

        private:
               // Currently nothing is here

};

#endif // #ifndef ml-ev5_h
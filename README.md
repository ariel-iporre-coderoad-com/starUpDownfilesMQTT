# STAR upload and download files via MQTT 


Tools to upload or download files and programs in the STARFLEX via MQTT.

##  INSTALL

npm install

## USAGE


To upload a file use:
```bash
node mqttUploadFile.js [broker ip] [request topic] [response topic] [path to file]
```

to upload a node program:

```bash
node mqttUploadFile.js [broker ip] [request topic] [response topic] [path to file] --node
```

to download a file:
```bash
node mqttDownloadFile.js [broker ip] [request topic] [response topic] [path to file]
```

to download a : node program
```bash
node mqttDownloadFile.js [broker ip] [request topic] [response topic] [path to file] --node
```

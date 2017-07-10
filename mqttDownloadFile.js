	// Requires
var fs = require('fs');
var mqtt = require('mqtt');
var path = require('path');
var md5 = require('md5-file');

var params = {
	broker: null,
	port: 1883,
	file: null,
	reqTopic: null,
	respTopic: null,
	uuid: null,
	node: false
}

if(process.argv.length <= 3) {
	console.log("Usage: node mqttDownloadFile.js <broker> <reqTopic> <file> --node --port <port> --uuid <uuid>");
	console.log("   <broker> - mqtt broker address");
	console.log("   <reqTopic> - request topic");
	console.log("   <respTopic> - response topic");
	console.log("   <file> - file path to upload");
	console.log("   --node - to indicate that we are downloading a node program.");
	console.log("   --port <port> - mqtt broker port");
	console.log("   --uuid <uuid> - uuid to which make request");
	return;
}

// ----------------------------
// read params
// ----------------------------
var indexParam;
for(indexParam = 2; indexParam < process.argv.length; indexParam++)
{
	if(indexParam == 2) {
		params.broker = process.argv[2];
	} else if(indexParam == 3) {
		params.reqTopic = process.argv[3];
	} else if(indexParam == 4) {
		params.respTopic = process.argv[4];
	} else if(indexParam == 5) {
		params.file = process.argv[5];
	} else {
		var optName = process.argv[indexParam];
		if(optName === "--node") {
			params.node = true;
		} else if(optName === "--port") {
			params.uuid = parseInt(process.argv[indexParam + 1]);
		} else if(optName === "--uuid") {
			params.uuid = process.argv[indexParam + 1];
		}
	}
}

if(params.uuid == null ) {
	var high = 10000;
	var low = 1;
	params.uuid = Math.floor(Math.random() * (high - low) + low);
}

var client  = mqtt.connect('mqtt://'+params.broker+":"+params.port);

var destfile = __dirname + "/" + params.file + ".downloaded";

try {
	console.log("deleting previous downloaded file if existed.");
	fs.unlinkSync(destfile);
} catch (ex) {
	// nothing to do here. the file does not exists
	// it does not need to be deleted.
}

client.on('connect', function () {
	client.subscribe(params.respTopic);
	var cmd = "file/"+params.file;
	if(params.node) {
		cmd = "node/program/"+params.file;
	}

	var fileName = path.basename(params.file);
	var message = {
		uuid:params.uuid, 
		method:"GET", 
		cmd: cmd
	}

	console.log("Sending request to get file");
  	client.publish(params.reqTopic, JSON.stringify(message));
});

client.on('message', function(topic, message){
	var data = JSON.parse(message);
    console.log("================== ");
    console.log("  " + topic);
    console.log("================== ");
    console.log("----------_>>  New message:  " +  message)

	if(data.uuid === params.uuid) {
		if(data.status == 206) {
			console.warn("Chunk received.");
            console.log("======>   Object.keys(data.body) " +  Object.keys(data));
            console.log("======>   data.body.chunk " + data.body.chunk );
			var buf = new Buffer(data.body.chunk, 'base64');
			fs.appendFile(destfile, buf, 'binary');
		} else if(data.status == 200) {
			md5.async(destfile, function(checksum) {
				console.warn("md5sum: " + checksum);
				client.end();
			});
		}
	}
});

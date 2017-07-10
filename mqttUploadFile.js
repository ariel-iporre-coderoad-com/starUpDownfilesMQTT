// Requires
var fs = require('fs');
var mqtt = require('mqtt');
var path = require('path')

// Constants
var CHUNK_SIZE = 64*1024; 

var params = {
	broker: null,
	port: 1883,
	file: null,
	node: false,
	reqTopic: null,
	respTopic: null,
	uuid: null,
	delay: 0,
	noStrictACK: false
}

if(process.argv.length <= 3) {
	console.log("Usage: node mqttUploadFile.js <broker> <reqTopic> <respTopic> <file> --node --noStrictACK --port <port> --uuid <uuid>  --delay <delay>");
	console.log("   <broker> - mqtt broker address");
	console.log("   <reqTopic> - request topic");
	console.log("   <respTopic> - response topic");
	console.log("   <file> - file path to upload");
	console.log("   --node - to indicate that we are uploading a node program.");
	console.log("   --noStrictACK - to indicate to not use strict ACK" );
	console.log("   --port <port> - mqtt broker port");
	console.log("   --uuid <uuid> - uuid to which make request");
	console.log("   --delay <delay> - delay in ms between mqtt requests");
	return;
}

var chunkNumber = 0;

function uploadChunk(stream, fileName){
	var cmd = "file";
	if(params.node) {
		cmd = "node/program";
	}

	console.log("sending chunk: " + (++chunkNumber) + " (uuid: "+params.uuid+")");

	var chunk = stream.read(CHUNK_SIZE);
	if(chunk != null) {

		var buf = new Buffer(chunk);
		var encoded = buf.toString('base64');

		var chunk_message = {
			uuid: params.uuid, 
			method: "POST", 
			cmd: cmd, 
			body: {
				chunk: encoded
			}
		}
	
		client.publish(params.reqTopic, JSON.stringify(chunk_message));

		if(params.noStrictACK) {
			setTimeout(uploadChunk,params.delay, stream, fileName);		
		}
	} else {
		console.log("no chunks to send.");
	}
}

function initiateFileUpload(stream){
	var fileName = path.basename(params.file);
	var stats = fs.statSync(params.file);
	var chunks = Math.ceil(stats["size"]/CHUNK_SIZE);
	console.log(
		"File name: " + fileName +
		", stats: " + JSON.stringify(stats, null, '\n') +
		", chunks: " + chunks );

	var cmd = "file";
	if(params.node) {
		cmd = "node/program";
	}

	var first_message = {
		uuid:params.uuid, 
		method:"POST", 
		cmd:cmd, 
		body: {
			file: fileName,
			fileSize: stats["size"],
			chunks: chunks,
			chunkSize: CHUNK_SIZE
		}
	}

	if(params.noStrictACK) {
		first_message.body.strictACK = false;
	}

	console.log("Sending first request. with number of chunks and chunk size info.");
  	client.publish(params.reqTopic, JSON.stringify(first_message));

  	if(params.noStrictACK) {
  		stream.on('readable', function() {
			setTimeout(uploadChunk,params.delay, stream, fileName);	  
		});	
  	}
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
		} else if(optName === "--verbose") {
			params.verbose = true;
		} else if(optName === "--delay") {
			params.delay = parseInt(process.argv[indexParam + 1]);
		} else if(optName === "--noStrictACK") {
			params.noStrictACK = true;
		}
	}
}

if(params.uuid == null ) {
	var high = 10000;
	var low = 1;
	params.uuid = Math.floor(Math.random() * (high - low) + low);
}

var stream = fs.createReadStream(params.file, {flags: 'r'});

// script
var client  = mqtt.connect('mqtt://'+params.broker+":"+params.port);

client.on('connect', function () {
	console.log("Connected initializing upload")
	client.subscribe(params.respTopic);
	client.publish('/abc','abc');
	setTimeout(initiateFileUpload, 1000, stream);
});

client.on('message', function (topic, message) {

  if(topic === params.respTopic) {
  	var data = JSON.parse(message);
  	var fileName = path.basename(params.file);
      console.log("================== ");
      console.log("  " + topic);
      console.log("================== ");
      console.log("----------_>>  New message:  " +  message)
  	if(data.status == 202 || data.status == 100) {
  		uploadChunk(stream, fileName);
  	}	
	console.log(data.status);
  }
});
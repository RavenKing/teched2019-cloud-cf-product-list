const express = require('express');
var log = require('cf-nodejs-logging-support');
const { sendMessage,readMessage,getMessageFromDB,insertMessageIntoDB,sendNotification} = require('./lib/destination');
const app = express();
const port = process.env.port || 8080;

const bodyParser =require("body-parser");
log.setLoggingLevel("warn");
app.use(log.logNetwork);

// secure the direct call to the application
// const passport = require('passport');
// const { JWTStrategy } = require('@sap/xssec');
// const xsenv = require('@sap/xsenv');
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.get('/educationTime',checkReadScope, dbGet);
app.get('/alertNotification',checkReadScope, sendNotificationF);
app.post('/educationTime',checkReadScope, insertMessageTest);

function insertMessageTest(req,res)
{	
	console.log(req.body);
	insertMessageIntoDB(req.body,res);

}
function sendNotificationF(req,res)
{
	sendNotification(req,res);
}
function dbGet(req,res)
{
	req.logger.info("read Method started");
	getMessageFromDB(req,res);
}


// Scope check
function checkReadScope(req, res, next) {
		return next();
}

// Serve static files
app.use('/', express.static('static/webapp'));
app.use('/reporting', express.static('reporting/webapp'));

app.listen(port, () => {
	console.log('%s listening at %s', app.name, port);
})

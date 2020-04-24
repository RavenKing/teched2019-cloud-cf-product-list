const express = require('express');
const { sendMessage,readMessage,getMessageFromDB,insertMessageIntoDB} = require('./lib/destination');
const app = express();
const port = process.env.port || 8080;

const bodyParser =require("body-parser");

// secure the direct call to the application
// const passport = require('passport');
// const { JWTStrategy } = require('@sap/xssec');
// const xsenv = require('@sap/xsenv');
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
// // XSUAA Middleware
// passport.use(new JWTStrategy(xsenv.getServices({uaa:{tag:'xsuaa'}}).uaa));

// app.use(passport.initialize());
// app.use(passport.authenticate('JWT', { session: false }));

app.get('/sendEnterpriseMessage',checkReadScope, sendMessageQ);
app.get('/readEnterpriseMessage',checkReadScope, getMessage);
app.get('/getMessageFromDB',checkReadScope, dbGet);
app.post('/insertMessage',checkReadScope, insertMessageTest);
 //app.get('/token',checkReadScope, getJWTToken);
//capp.get('/orders',checkReadScope, readOrderDetails);

function insertMessageTest(req,res)
{	
	console.log(req.body);
	insertMessageIntoDB(req.body.message,res);

}
function dbGet(req,res)
{
	getMessageFromDB(res);
}
// function getJWTToken(req,res)
// {
// 	const authHeader=req.headers['authorization'];
//    res.send(authHeader.split(' ')[1]);
// }
function getMessage(req,res)
{
	readMessage(res);
	res.send("reciving messages")
}
function  sendMessageQ(req,res)
{
	sendMessage();
	res.send({reply:"sent one demo message"})
}

// Scope check
function checkReadScope(req, res, next) {
	//prerequiste: JWT or user info should be sent from CAI  
	//Two ways to check the authorizaton
	// 1. Check the scope in the JWT token
	// 2. Check the scope in the body of the request
	// ABB can choose which approach to do the authorization
	// 
	//if (req.authInfo.checkLocalScope('read')) {
		return next();
	// } else {
    // 	console.log('Missing the expected scope');
    // 	res.status(403).end('Forbidden');
	// }
}

// Serve static files
app.use('/', express.static('static/webapp'));

app.listen(port, () => {
	console.log('%s listening at %s', app.name, port);
})

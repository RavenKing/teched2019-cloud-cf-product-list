"use strict";

/*********************************************************
 * Imports
 *********************************************************/
const fs = require('fs');
const url     = require("url");
const https   = require('https');
const uaa     = require('predix-uaa-client');
const request   = require('request');
// const rp = require('request-promise');
const path = require('path');
// const { Pool, Client } = require('pg');
const nanoid = require('nanoid');
const jwtDecode = require('jwt-decode');
const schedule = require('node-schedule');
// const dbco   = require("./dbco");
// const DEST_APP_FILE     = "dest-app.json";
// const DESTINATION_BASIC = "BasicAuthentication";
// const DESTINATION_PRINCIPAL = "PrincipalPropagation";
const crypto = require('crypto');
var sha1 = crypto.createHash('sha1');

var destination_name = process.env.destination_name;
var destination_path = process.env.destination_path;

var env_VCAP_SERVICES = process.env.VCAP_SERVICES;
var services = {};
var destination = {};
var xsuaa = {};
var connectivity = {};
var postgresql = {};
if(env_VCAP_SERVICES){
  var xsenv   = require('@sap/xsenv');
  services = xsenv.getServices({
    connectivity: { tag: 'connectivity' },
    destination:  { tag: 'destination'  },
    xsuaa:        { tag: 'xsuaa'        },
    postgresql:   { tag: 'postgresql'   }
  });
  // }, "env_VCAP_SERVICES");
  connectivity     = services["connectivity"];
  destination      = services["destination"];
  xsuaa            = services["xsuaa"];
  postgresql       = services["postgresql"];
  // console.log("-----------Services-----------------");
  // console.log(services);
}  


var sys_dest_map_obj = {};
fs.readFile(path.join(__dirname, 'system_destination_mapping.json'), 'utf8', function (err, data) {
	console.log("read system_destination_mapping.json finished");
	if (err) {
	   return console.error(err);
	}
	sys_dest_map_obj = JSON.parse(data.toString()).sys_dest_map;
  console.log(sys_dest_map_obj);
});

var intent_Arr = [];
fs.readFile(path.join(__dirname, 'intents_config.json'), 'utf8', function(err, data){
	console.log("read intents_config.json finished");
	if (err) {
	   return console.error(err);
	}
	intent_Arr = JSON.parse(data.toString()).intents;	
});

// var slack_workspace_Arr = [];
// var channel_Arr = [];
// fs.readFile(path.join(__dirname, 'slack_config.json'), 'utf8', function(err, data){
// 	console.log("read slack_config.json finished");
// 	if (err) {
// 	   return console.error(err);
// 	}
// 	slack_workspace_Arr = JSON.parse(data.toString()).WORKSPACE;	
// });

var chatAppAuthArr = [];
var destToken, connToken, uaaToken;
var approuterUrl = "http://approuter-demo-i303059.cfapps.us10.hana.ondemand.com";

var slack_postMessage_url = "https://slack.com/api/chat.postMessage";
var slack_postMessage_url_parse = url.parse(slack_postMessage_url);
var optionsSlack = {
  protocol: slack_postMessage_url_parse.protocol,
  host: slack_postMessage_url_parse.host,
  port: slack_postMessage_url_parse.port,
  path: slack_postMessage_url_parse.path,    
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // "Authorization": "Bearer " + botToken
    // "Content-Length": Buffer.byteLength(postData)
  }
};

var userContextArr = [];
var destinationConfig = {};
var backendSystemCookie;
var backendSystemOptions = {};

class Utils {

  constructor() {
    this.init();
  }

  static init(){
    console.log("Initializing...");
    if(env_VCAP_SERVICES){
      this.getDestinationToken();
      this.getConnectivityToken();
      this.getUaaToken();
    }

    this.dbco = require("./dbco");
    this.initChatAppAuth();
    this.initUserContextArr();
    this.backgroundJob();
  }

  static initChatAppAuth(){
    // var that = this;
    this.dbco.getPGChatUIAppToken({}, function(err, body){

      if(!err){
        // console.log(body);
        chatAppAuthArr = body;
        console.log("chatAppAuthArr in init:   ", chatAppAuthArr);
        //one slack app
        if(chatAppAuthArr.length == 1){
          optionsSlack.headers["Authorization"] = "Bearer " + chatAppAuthArr[0].bot_access_token;
          console.log("optionsSlack:   ", optionsSlack);
        }
      }
      else{
        console.log(err);
      }      
    });
  }

  static initUserContextArr(){
    userContextArr = [];
    this.dbco.getPGChatUIAllUsers(function(err, body){
      console.log("in get all users callback");
      // console.log(body);
      // console.log(err);
      if(!err){
        if(body.length == 0){
          console.log("no slack users found");
          // Utils.generateSlackUserMappingURL(req.body);
        }
        else {
          console.log("users found");
          var userObj = {};
          // var exchangeToken = body[0].exchange_token;
          // console.log(exchange_token);
          for(var i in body){
            userObj = body[i];
            userObj.conversationId = Utils.generateRandomID(11);
            userContextArr.push(userObj);
          }
          console.log("user context initialized!")
          // console.log(userContextArr);
        }
      }
      else{
        // res.send(err.message);
        console.log("get all users failed");
      }
    });    
  }

  static backgroundJob(){
    console.log("start to schedule background job: ", new Date());
    var rule = new schedule.RecurrenceRule();
    // rule.hour = [0,6,12,18];
    rule.minute = 30;
    schedule.scheduleJob(rule, this.bgRefreshUserToken);    
  }

  static bgRefreshUserToken(){
    var d = new Date()
    console.log("time now: ", d);
    var userToBeDeleted = [];
    var userToBeUpdated = [];
    var token, decoded;
    // var userContextArrTmp = userContextArr;
    // var userContextArrNew = [];
    for (var i = userContextArr.length - 1; i >= 0; i--) {
      var userContextObj = userContextArr[i];
      //token from router
      token = userContextObj.token_from_router;
      decoded = jwtDecode(token);
      console.log(decoded.exp, "---");
      console.log(d.getTime()/1000);
      if(decoded.exp < d.getTime()/1000){
        userToBeDeleted.push(userContextObj.userid);
        continue;
      }
      //token from exchange token
      token = userContextObj.exchange_token;
      decoded = jwtDecode(token);
      console.log(decoded.exp, "---");
      console.log(d.getTime()/1000);      
      if(decoded.exp < d.getTime()/1000){
        userToBeUpdated.push(userContextObj);
      }      

    }

    console.log("userToBeDeleted:", userToBeDeleted);
    console.log("userToBeUpdated:", userToBeUpdated);


    async function f(){
      console.log("in async f");
      if(userToBeDeleted.length){
        var queryObj = {
          useridArr: userToBeDeleted
        };
        await Utils.dbco.deletePGChatUIUsers(queryObj, function(err, body){
          if(!err){
            console.log("user deleted in db: ", queryObj.useridArr);
            // Promise.resolve('deleted');
            return "deleted";
          }
        });
        
      }
      else{
        return "no need to delete";
      }
    };
    f().then((str) => {
      console.log(str);
      async function f1(){
        console.log("in async f1");
        if(userToBeUpdated.length){
          for(var i in userToBeUpdated){
            userToBeUpdated[i].refresh_token = await Utils.getRefreshToken(userToBeUpdated[i].token_from_router);
            userToBeUpdated[i].exchange_token = await Utils.getExchangeToken(userToBeUpdated[i].refresh_token);
            console.log(userToBeUpdated[i]);
            await Utils.dbco.updatePGChatUIUsers(userToBeUpdated[i], function(err, body){
              if(!err){
                return "deleted";
              }
            })            
          }
          console.log(userToBeUpdated);      
          
        }
        else{
          return "no need to update";
        }
      };   
      f1().then((str) => {
        console.log(str);
        if (str == "Updated") {
          Utils.initUserContextArr();
          
        }
        else{
          console.log("no need to update")
        }
      }).catch(e => console.log(e));   
    }).catch(e => console.log(e));
  }

  static getDestinationToken(){
    if(destToken){
      return destToken;
    }
    else{
      uaa
      .getToken(xsuaa.url + "/oauth/token", destination.clientid, destination.clientsecret)
      .then(token => {
        destToken = token.access_token;

        console.log("destination service token got: ");
        console.log(destToken);
        return destToken;
      });

    }
  } 

  static getConnectivityToken(){
    if(connToken){
      return connToken.access_token;
    }
    else{
      uaa
      .getToken(xsuaa.url + "/oauth/token", connectivity.clientid, connectivity.clientsecret)
      .then(token => {
        connToken = token;

        console.log("connectivity service token got:");
        console.log(connToken);
        return connToken;
      });

    }
  }

  static getUaaToken(){
    if(uaaToken){
      return uaaToken.access_token;
    }
    else{
      uaa
      .getToken(xsuaa.url + "/oauth/token", xsuaa.clientid, xsuaa.clientsecret)
      .then(token => {
        uaaToken = token;

        console.log("uaa service token got:");
        console.log(uaaToken);
        return uaaToken;
      });

    }
  }

  static getBackendSystemOptions(){
    if(backendSystemOptions){
      return backendSystemOptions;
    }
    else{
      // return {   
      //   uri : destinationInfoObj.destinationConfiguration.URL + destination_path,
      //   headers : {
      //     // "Authorization" : auth,
      //     "Content-Type":"application/json",
      //     "x-csrf-token":"Fetch",
      //     "Proxy-Authorization": "Bearer " + exchangeToken,
      //   },
      //   // proxyHost : connectivity.onpremise_proxy_host,
      //   // proxyPort : connectivity.onpremise_proxy_port,
      //   proxy : "http://" + connectivity.onpremise_proxy_host + ":" + connectivity.onpremise_proxy_port,
      // };
    }
  }

  static getDestinationConfig(destinationName){
    if(destinationConfig[destinationName]){
      console.log("destinationConfig found");
      return Promise.resolve(destinationConfig[destinationName]);
    }
    else{
      var uri = url.parse(destination.uri + "/destination-configuration/v1/destinations/" + destinationName);
      var options = {
        protocol: uri.protocol,
        host: uri.host,
        port: uri.port,
        path: uri.path,
        headers: {}
      };   
      options.headers["Authorization"] = "Bearer " + Utils.getDestinationToken();
      // console.log(options);
      return new Promise(function(resolve, reject){
        https.get(options, (destRes) => {
          destRes.setEncoding('utf8');
          let data = '';
          destRes.on('data', function(chunk){
            console.log("data: " + chunk);
            data += chunk;
            destinationConfig[destinationName] = JSON.parse(data)
            resolve(destinationConfig[destinationName]);            
          });
          // destRes.on('end', () => {

          // });
        }).on('error', (e) => {
          console.error(e);
          reject("destination service error - see logs");
        });        
      });
      
    }

  }

  static getBackendServiceCookie(destinationInfoObj, destinationPath, exchangeToken){
    if(backendSystemCookie){
      return backendSystemCookie
    }
    else{
      var options = {   
        uri : destinationInfoObj.destinationConfiguration.URL + destination_path,
        headers : {
          // "Authorization" : auth,
          "Content-Type":"application/json",
          "x-csrf-token":"Fetch",
          "Proxy-Authorization": "Bearer " + exchangeToken,
        },
        // proxyHost : connectivity.onpremise_proxy_host,
        // proxyPort : connectivity.onpremise_proxy_port,
        proxy : "http://" + connectivity.onpremise_proxy_host + ":" + connectivity.onpremise_proxy_port,
      };
      console.log("-------------options-----------");
      console.log(options);    
      return new Promise(function(resolve, reject){
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("log in get cookie");
                // body = JSON.parse(body);
                // console.log(body);
                // res1.send(body);                   

                backendSystemCookie = response.headers['set-cookie']
                // resp.SessionId = body.SessionId;

                // connectedStatus = true;

                resolve(backendSystemCookie);
            } else {
                console.log("error message");
                console.log(error);
                // console.log(response);
                console.log(response.statusCode);
                // console.log(response);
                reject(error, response);
            }
        });
      });
    }

  }

  static getBackendServiceFinalData(destinationInfoObj, destinationPath, exchangeToken, backendServiceCookie){
    var options = {   
      uri : destinationInfoObj.destinationConfiguration.URL + destination_path,
      headers : {
        // "Authorization" : auth,
        "Content-Type":"application/json",
        "x-csrf-token":"Fetch",
        "Proxy-Authorization": "Bearer " + exchangeToken,
      },
      // proxyHost : connectivity.onpremise_proxy_host,
      // proxyPort : connectivity.onpremise_proxy_port,
      proxy : "http://" + connectivity.onpremise_proxy_host + ":" + connectivity.onpremise_proxy_port,
    };

    return new Promise(function(resolve, reject){
      request.get(options, function (error, response, body) {
          if (!error && response.statusCode == 200) {
              console.log("--------------Got Odata----------------");
              // body = JSON.parse(body);
              // delete body["odata.metadata"];
              // res.setHeader('Content-Type', 'application/xml');
              console.log(body);
              resolve(body);                      
          } else {
              console.error("Error on GetItems " + error);
          }
      });      
    })
  }

  static getBackendCsrfToken(){

  }

  static getRefreshToken(userToken){
    console.log("----------------in getRefreshToken");
    return new Promise(function(resolve, reject){
      console.log("------------------in getRefreshToken Promise");
      var options = {
        uri: xsuaa.url + "/oauth/token?grant_type=user_token&response_type=token&client_id=" + connectivity.clientid,
        headers: {
          "Accept": "application/json",
          "Authorization": userToken
        }          
      };
      console.log(options);
      request.post(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("log in get refresh_token");
            console.log(body);
            // body = JSON.parse(body);
            resolve(JSON.parse(body).refresh_token);
        } else {
            console.log("error message");
            console.log(error);
            console.log(response.statusCode);
            console.log(response.body);
            reject(error, response);
        }
      })
    });
  }

  static getExchangeToken(refreshToken){
    return new Promise(function(resolve, reject){
      var options = {
        uri: xsuaa.url + "/oauth/token?grant_type=refresh_token&refresh_token=" + refreshToken,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": "Basic " + 
            new Buffer(connectivity.clientid + ":" + connectivity.clientsecret).toString("base64")
        }          
      };
      // console.log(optionsTmp);
      request.post(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("log in get exchange_token");
            console.log(body);
            // body = JSON.parse(body);
            resolve(JSON.parse(body).access_token);
        } else {
            console.log("error message");
            console.log(error);
            console.log(response.statusCode);
            console.log(response.body);
            reject(error, response);
        }
      })
    });
  }

	static getServiceByName(name) {
    if(services){
		  return services[name];
    }
	}

  static getBackendProxy(){
    return "http://" + connectivity.onpremise_proxy_host + ":" + connectivity.onpremise_proxy_port;
  }

	static getDestinationName() {
		return process.env.destination_name;
	}

	static getDestinationPath() {
		return process.env.destination_path;
	}		
	
	static getDestinationNamebySystem(system_id) {
		var destination_name = "";
		if(intent_Arr){
			var customerDestArr = sys_dest_map_obj["customer1"];
			for(var i in customerDestArr){
				if(customerDestArr[i].system_id == system_id){
					destination_name = customerDestArr[i].destination_name;
					break;
				}
			}
		}
		else{
			return console.log("read system_destination_mapping error!");
		}
		return destination_name;
	}	

	static getODataPathbyIntent(intent_name) {
		var odata_path = "";
		if(intent_Arr){
			for(var i in intent_Arr){
				if(intent_Arr[i].name == intent_name){
					odata_path = intent_Arr[i].odata_path;
					break;
				}
			}
		}
		else{
			return console.log("read intent_Arr error!");
		}
		return odata_path;
	}		

	static getIntentConfbyIntent(intent_name) {
		var intent_config_obj = {};
		if(intent_Arr){
			for(var i in intent_Arr){
				if(intent_Arr[i].name == intent_name){
					intent_config_obj = intent_Arr[i];
					break;
				}
			}
		}
		else{
			return console.log("read intent_Arr error!");
		}
		return intent_config_obj;
	}			

	static getWorkspaceTokenbyID(workspace_id) {
		var workspace_token = "";
		if(slack_workspace_Arr){
			for(var i in slack_workspace_Arr){
				if(slack_workspace_Arr[i].id == workspace_id){
					//to be updated; issue will happen when multiple users
					channel_Arr = slack_workspace_Arr[i].channels;
					workspace_token = slack_workspace_Arr[i].token;
					break;
				}
			}
		}
		else{
			return console.log("read slack_workspace_Arr error!");
		}
		return workspace_token;
	}			

	static getChannelWebhookbyName(channel_name) {
		var channel_webhook = "";
		if(channel_Arr){
			for(var i in channel_Arr){
				if(channel_Arr[i].channel_name == channel_name){
					channel_webhook = channel_Arr[i].webhook_url;
					break;
				}
			}
		}
		else{
			return console.log("read channel_Arr error!");
		}
		return channel_webhook;
	}			

	static sendMessagetoChatUI(postData){
    console.log("optionsSlack:", optionsSlack);
    console.log(postData);
    let httpspost = https.request(optionsSlack, (res) => {
      res.setEncoding('utf8');
      res.on('data', function(chunk){
        console.log("send message to channel");
      });
    });
    httpspost.on('error', (e) => {
      console.error(e);
    });  
    httpspost.write(postData);
    httpspost.end();		
	}

  static getBackendData(destination_name, odata_path, odata_key_value, callback){
  	var options = { 
  	  uri: "", 
  	  proxy: "",
  	  headers: {

  	  }
  	}; 	
  	var tokens_arr = [];
  	Promise.all([Utils.getDestinationToken(destination_name), Utils.getConnectivityToken()])
  	.then((tokens) => {
      //to get destination info
      tokens_arr = tokens;
      var uri = url.parse(destination.uri + "/destination-configuration/v1/destinations/" + destination_name);
      var options = {
        protocol: uri.protocol,
        host: uri.host,
        port: uri.port,
        path: uri.path,
        headers: {}
      };   
      options.headers["Authorization"] = "Bearer " + tokens[0].access_token;

      var p =  new Promise(function(resolve, reject){
        https.get(options, (destRes) => {
          destRes.setEncoding('utf8');
          let data = '';
          destRes.on('data', function(chunk){
            console.log("data: " + chunk);
            data += chunk;
          });
          destRes.on('end', () => {
            resolve(data);
          });
        }).on('error', (e) => {
          console.error(e);
          reject("destination service error - see logs");
        });        
      });
      return p;	    		
  	}).then((data) => {
  		console.log(data);
  		var dataObj = JSON.parse(data);
  		var destUser = dataObj.destinationConfiguration.User;
  		var destPass = dataObj.destinationConfiguration.Password;
  		options = {
  			uri: dataObj.destinationConfiguration.URL + odata_path + "('" + odata_key_value + "')?$format=json",
  			proxy: "http://" + connectivity.onpremise_proxy_host + ":" + connectivity.onpremise_proxy_port,
  			headers: {
          "Content-Type":"application/json",
          "x-csrf-token":"Fetch",
          "Authorization": "Basic " + new Buffer(destUser + ":" + destPass).toString("base64"),			
          "Proxy-Authorization": "Bearer " + tokens_arr[1].access_token
  			}
  		};
  		console.log("options", options);

      var resp = {};
      var p = new Promise(function(resolve, reject){
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // console.log("log in get cookie, optionsSAL:", options);
                // body = JSON.parse(body);
                // console.log(body);
                // res1.send(body);                   

                resp.cookie = response.headers['set-cookie']
                // resp.SessionId = body.SessionId;

                // connectedStatus = true;

                resolve(resp);
            } else {
                console.log("error message");
                console.log(error);
                console.log(response);
                console.log(response.statusCode);
                // console.log(response);
                reject(error, response);
            }
        });
      });
      return p;		
  	}).then(resp => {
      options.headers["Cookie"] = resp.cookie;

      console.log("log in final request");
      console.log(options);
      request.get(options, function (error, response, body) {
          if (!error && response.statusCode == 200) {
              console.log("--------------Got Odata----------------");
              console.log(body);
              // body = JSON.parse(body);
              // delete body["odata.metadata"];
              // res.setHeader('Content-Type', 'application/xml');
              // res.send(body);   
              // resolve(body);   
              return callback(null, JSON.parse(body));                  
          } else {
              console.error("Error" + error);
              return callback(error);
              // reject(error);
          }
      });
  	});

  }	

  static randomWord(randomFlag, min, max){
    var str = "", pos = "",
        range = min,
        arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 
        'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
 
    if(randomFlag){
        range = Math.round(Math.random() * (max-min)) + min;
    }
    for(var i=0; i<range; i++){
        pos = Math.round(Math.random() * (arr.length-1));
        str += arr[pos];
    }
    return str;
  }

  static generatePasswordToken(pass){
    sha1.update(pass);
    return sha1.digest('hex');
  }

  static generateRandomID(length){
    if(length){
      return nanoid(length);
    }
    else{
      return nanoid();
    }
  }

  static verifyAdminPassword(username, pass){
    
  }

  static getEmailFromToken(token){
    var decoded = jwtDecode(token);
    console.log(decoded);    
    // console.log(decoded.email);    
    return decoded.email;
  }  

  static addUsertoUserContextArr(userObj){
    console.log("addUsertoUserContextArr");
    userObj.conversationId = Utils.generateRandomID(11);
    userContextArr.push(userObj);
    // console.log(userContextArr);
  }

  static getUserFromUserContextArr(userid){
    var userObj = {};
    for(var i in userContextArr){
      if(userContextArr[i].userid == userid){
        userObj = userContextArr[i];
        break;
      }
    }
    return userObj;
  }

  static updateUserConversationId(userid){
    for(var i in userContextArr){
      if(userContextArr[i].userid == userid){
        userContextArr[i].conversationId = Utils.generateRandomID(11);
        break;
      }
    }    
  }

  static generateSlackUserMappingURL(body){
    console.log(chatAppAuthArr);
    // console.log(body);
    var appid = body.api_app_id;
    var channel_id = body.event.channel;
    var slack_user_id = body.event.user;
    console.log(optionsSlack);
    var postData = JSON.stringify({
      "text": "Hello. Your slack user is not connected to SAP IDP account. Please click below button to bind the two accounts.",
      "channel": channel_id,
      "attachments": [
        {
          "fallback": "click button to perform user mapping",
          "color": "#3AA3E3",
          "actions": [
              {
                  "name": "user mapping",
                  "text": "Connect to IDP Account",
                  "style": "primary",
                  "type": "button",
                  "url": approuterUrl + "/slack/usermapping/" + slack_user_id
              }
          ]
        }
      ]
    });  
    console.log("postData:", postData);
    Utils.sendMessagetoChatUI(postData); 
  }

  static handleResponseFromRecast(resDialog, channel_id){
    console.log("handleResponseFromRecast");
    resDialog.messages.map(function(message){
      switch(message.type){
        case "text":
          console.log("text");
          var postData = JSON.stringify({
            "text": message.content,
            "channel": channel_id
          }); 
          Utils.sendMessagetoChatUI(postData);        
          break;
        case "quickReplies":
          console.log("quickReplies");
          var postDataObj = {
            "text": message.content.title,
            "channel": channel_id,
            "attachments": [
              {
                "fallback": message.content.title,
                "color": "#3AA3E3",
                "callback_id": "recast_button",
                "actions": [

                ]
              }
            ]
          };

          var recastButton = message.content.buttons;
          for(var i in recastButton){
            console.log(recastButton[i]);
            postDataObj["attachments"][0]["actions"].push({
              "name": recastButton[i].value,
              "text": recastButton[i].title,
              "value": recastButton[i].value,
              "type": "button"
            })
          }
          console.log(postDataObj);
          Utils.sendMessagetoChatUI(JSON.stringify(postDataObj)); 
          break;
        default:
          console.log("default");
      }

    });
  }

}

module.exports = Utils;
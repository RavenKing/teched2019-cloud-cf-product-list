'use strict';
const xsenv = require('@sap/xsenv');
const request = require('request');
const axios = require('axios');


const hanaClient=require("@sap/hana-client");
const connection = hanaClient.createConnection();

function insertMessageIntoDB(data,res)
{

    getCredentials().then((result)=>{
        return insertDBMessage(data,result)
      }).then((result)=>{
          console.log(result);
          res.send({reply:result});
      });
}
function insertDBMessage(data,result)
{
    return new Promise(function(resolve)
    {
        connection.connect(result,(err)=>{
            
            console.log("getData"+data);
            if(data.eduData.length>0)
            {
                for(var i=0;i<data.eduData.length;i++)
                {
                    var sql="INSERT INTO \"EDUCATIONTIME_HDI_DB_1\".\"educationTime.db::edu_master.educationTime\" VALUES('"+data.user_id+"','"+
                    data.calendar_week+"','"+data.eduData[i].edu_source+"','"+data.eduData[i].edu_topic+"',"
                    +data.eduData[i].edu_duration+",'"+data.user_name+"','"+data.eduData[i].comment+"','"
                    +data.eduData[i].edu_area+"','"+data.certificate_source+"','"+data.certificate_topic+"','"
                    +data.certificate_area+"','"+data.team+"')";
                      connection.exec(sql,(err,rows)=>{
                        console.log(rows);
                    })
                }
            }
            resolve("done")
        })
    });
}
function getMessageFromDB(req,res)
{
     getCredentials().then((result)=>{
    req.logger.info("Credential got");
      return getDBConnection(result)
    }).then((result)=>{
        //console.log(result);
    req.logger.warn("DB connected");
        res.send(result);
    });
}
function getDBConnection(result)
{
    return new Promise(function(resolve)
    {
        connection.connect(result,(err)=>{
         var sql="select * from  \"EDUCATIONTIME_HDI_DB_1\".\"educationTime.db::edu_master.educationTime\"";
            console.log(sql);
            console.log(err);
            connection.exec(sql,(err,rows)=>{
                console.log(err);
                console.log(rows);  
                connection.disconnect();
                resolve(rows);

            })
        })
    });
}
function getCredentials()
{
    return new Promise(function(resolve)
    {
        const hanaService=xsenv.getServices({
            hanatrial:{
                tag:'hana'
            }
        }).hanatrial
       // console.log(hanaService);
        const result = {
            host: hanaService.host,
            port: hanaService.port,
            uid: hanaService.user,
            pwd: hanaService.password,
            sslValidateCertificate : "false",
            encrypt: "true",
            databaseName:"H00"   
        }
        resolve(result);
    });
}

function getAlertCredentials()
{
    return new Promise(function(resolve)
    {
        const hanaService=xsenv.getServices({
            alert:{
                label:'alert-notification'
            }
        }).alert
        console.log(hanaService);
    
        resolve(hanaService);
    });
}
function getAlertOAuthToken(result)
{
    return new Promise(function(resolve){
        request({
            url: result.oauth_url,
            method: 'POST',
            json: true,
            form: {
                grant_type: 'client_credentials',
                client_id: result.client_id
            },
            auth: {
                user: result.client_id,
                pass: result.client_secret
            }
        },
            function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    body.url=result.url;
                    resolve(body);
                }
            });
    });
}
function sendNotificationFunction(result)
{
    return new Promise(function(resolve){

        var data ={
            "eventType": "good",
            "eventTimestamp": 1535618178,
            "resource": {
                "resourceType":"kevin",
                "resourceName":"Yangcf"
            },
            "severity": "FATAL",
            "category": "ALERT",
            "subject": "Sample Event Subject",
            "body": "Sample event body."
          };
        axios({
                    method:"post",
                    data:data,
                    url:result.url+"/cf/producer/v1/resource-events",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + result.access_token,
                    }
        }).then(function(response){
            resolve(response);
        }).catch(error=>{
            resolve(error)
        })
        });
}


function readMessage(res)
{
}

function sendMessage(){
}
function sendNotification(req,res)
{
    getAlertCredentials().then((result)=>{
        return getAlertOAuthToken(result);
    }).then((result)=>{
      return sendNotificationFunction(result);
    }).then(()=>{
        res.send({result:"sent a event"});
    });
    
}

module.exports = {
    getMessageFromDB:getMessageFromDB,
    sendMessage: sendMessage,
    readMessage:readMessage,
    insertMessageIntoDB:insertMessageIntoDB,
    sendNotification:sendNotification
}
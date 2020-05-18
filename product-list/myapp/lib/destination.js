'use strict';
const request = require('request');
const axios = require('axios');
const xsenv = require('@sap/xsenv');
　　var fs=require("fs");

var AWS = require('aws-sdk');
const pgsql=require('pg');
let connection=null;
var s3 = new AWS.S3({
    accessKeyId:"AKIASRWQYWCK572BLMGS",
    secretAccessKey:"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"
});

const params = {
    Bucket: "hcp-c7c8caee-ade9-41b7-99be-fc48e5cb8dea",
    Key: 'test1.txt' // File name you want to save as in S3
};
function s3upload(res,req){
    const params = {
        Bucket: "hcp-c7c8caee-ade9-41b7-99be-fc48e5cb8dea",
        Key: 'test1.txt'// File name you want to save as in S3
    };
    fs.writeFile('./newTest.txt', 'Kevin Yang I077541', { 'flag': 'a' }, function(err) {
        if (err) {
            throw err;
        } 
        // 写入成功后读取测试
        fs.readFile('./newTest.txt', 'utf-8', function(err, data) {
            if (err) {
                throw err;
            }
            params.Body=data;
            console.log(data);
            s3.putObject(params,function(err,data)
            {
            if (err) {
                    throw err;
                }
                res.send(data);
            });
        });
    });
   
    // fs.readFile("test.txt", function(err, data) {//readFile F一定要大写
    //          if(err){
    //              console.log(err + "打开文件夹错误");
    //              return;
    //          }  
    //          console.log(data);
    //          const params = {
    //             Bucket: "hcp-c7c8caee-ade9-41b7-99be-fc48e5cb8dea",
    //             Key: 'test.txt', // File name you want to save as in S3
    //             Body: data
    //         };
    //          s3.upload(params, function(err, data) {
    //             if (err) {
    //                 throw err;
    //             }
    //             console.log(`File uploaded successfully. ${data.Location}`);
    //         });
    //  });
  
}
function insertMessageIntoDB(data,res,req)
{

    getCredentials(req).then((result)=>{
        return insertDBMessage(data,result,req)
      }).then((result)=>{
          console.log(result);
          res.send({reply:result});
      });
}
function insertDBMessage(data,result,req)
{
    return new Promise(function(resolve)
    {
        if(connection==null)
        {
            connection= new pgsql.Pool(result);
        }
        var sql="insert into demo.\"demoName\" values('"+data.firstName+"','"+data.lastName+"',"+data.id+")";
        connection.query(sql,(err,result)=>{  
        if(err)
        {
            req.logger.error(err.message);
        }
        req.logger.info(result);
        resolve(result);            
        })
    });
}
function getMessageFromDB(req,res)
{
     getCredentials(req).then((result)=>{
    req.logger.info("Credential got");
      return getDBConnection(result,req)
    }).then((result)=>{
        //console.log(result);
    req.logger.warn("DB connected");
        res.send(result);
    });
}
function getDBConnection(result,req)
{
    return new Promise(function(resolve)
    {
        connection= new pgsql.Pool(result);
         var sql="select * from  demo.\"demoName\"";
    connection.query(sql,function(err,result,fields){
        if(err)
        {
            req.logger.warn(err.message);
        }
        req.logger.info(result);
        connection.end();
        resolve(result);
    });

    });
}
function getCredentials(req)
{
    return new Promise(function(resolve)
    {
        console.log("get credential")
        const pgService=xsenv.getServices({
            postgresql:{
                tag:'postgresql'
            }
        }).postgresql;
        req.logger.info(pgService); 
        const result = {
            host: pgService.hostname,
            port: pgService.port,
            user: pgService.username,
            password: pgService.password,
            database:pgService.dbname
        }
        req.logger.info(result);
         console.log(result);
        resolve(result);
    });
}

function getAlertCredentials()
{

}
function getAlertOAuthToken(result)
{
}
function sendNotificationFunction(result)
{
}


function readMessage(res)
{
}

function sendMessage(){
}
function sendNotification(req,res)
{
}
function s3read(res,req)
{ 
    
    s3.getObject(params,function(err,data){
    console.log(data);
    console.log(data.Body);
    var stringNew= Buffer.from(data.Body);
    var stringConverted= stringNew.toString("utf-8");
    res.send(stringConverted);
});
}
module.exports = {
    getMessageFromDB:getMessageFromDB,
    sendMessage: sendMessage,
    readMessage:readMessage,
    insertMessageIntoDB:insertMessageIntoDB,
    sendNotification:sendNotification,
    s3upload:s3upload,
    s3read:s3read
}
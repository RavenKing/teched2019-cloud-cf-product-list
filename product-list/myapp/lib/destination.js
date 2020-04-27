'use strict';
const xsenv = require('@sap/xsenv');
const service = 'kevin-em';

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
function getMessageFromDB(res)
{
     getCredentials().then((result)=>{
      return getDBConnection(result)
    }).then((result)=>{
        //console.log(result);
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



function readMessage(res)
{

    getCredentials().then((result)=>{
        connection.connect(result,(err)=>{
            if(err)
            {
                console.log("connection error"+err);
                return;
            }
            connected=true;
        })
    })

    client = new msg.Client(options);
    //------------------------------------------------------------------------------------------------------------------
    // Messaging client handler methods
    //------------------------------------------------------------------------------------------------------------------

    client
    .on('connected', () => {
      console.log('connected to enterprise messaging service');
    })
    .on('error', (err) => {
      console.log('error on enterprise messaging service occurred ' + err);
    })
    .on('disconnected', (hadError) => {
      console.log('connection to enterprise messaging service lost, trying to reconnect in ' + reconnect_retry_ms + ' ms');
      setTimeout(()=> client.connect(), reconnect_retry_ms);
    });

    //------------------------------------------------------------------------------------------------------------------
    // Input stream handler methods
    //------------------------------------------------------------------------------------------------------------------

    client.istream(inputX)
    .on('subscribed', () => {
      console.log('subscribed to ' + inputX);
    })
    .on('ready', () => {
      console.log('stream ready: ' + inputX);
    })
    .on('data', (message) => {
      let topic = 'dummy';
      if (message.source) {
          if (typeof message.source === 'string') {
              topic = message.source;
          } else if (message.source.topic) {
              topic = message.source.topic;
          }
      }
      const handler = ()=>{
          console.log("timeout Function");
        insertMessageIntoDB(message.payload.toString(),res);
      }
      setTimeout(handler, getRandomInt(1, 11));

      //------------------------------------------------------------------------------------------------------------------
      // Write the message payload to the log file
      //------------------------------------------------------------------------------------------------------------------

      console.log('message received: ' + message.payload.toString());
      message.done();
      //insertMessageIntoDB(message.payload.toString(),res); 
    });
    client.connect();
}

function sendMessage(){
    console.log("start messaging")

    client
    .on('connected', () => {
        console.log('connected');
        initTasks(taskList, client);
    })
    .on('drain', () => {
        console.log('continue');
    })
    .on('error', (error) => {
        console.log(error);
    });
    client.connect();

}

function setupOptions(tasks, options) {
    Object.getOwnPropertyNames(tasks).forEach((id) => {
        const task = tasks[id];
        options.destinations[0].ostreams[id] = {
            channel: 1,
            exchange: 'amq.topic',
            routingKey: task.topic
        };
    });
    return options;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
}

function initTasks(tasks, client) {
    Object.getOwnPropertyNames(tasks).forEach((id) => {
        const task = tasks[id];
        const stream = client.ostream(id);

        const handler = () => {
            console.log('publishing message number ' + counter + ' to topic ' + task.topic);

            const message = {
                target: { address: 'topic:' + task.topic },
                payload: Buffer.from("Demo Message Number " + counter)

            };
            if (!stream.write(message)) {
                console.log('wait');
                return;
            }
            //setTimeout(handler, getRandomInt(task.timerMin, task.timerMax));
            counter++;
        };

        stream.on('drain', () => {
            //setTimeout(handler, getRandomInt(task.timerMin, task.timerMax));
        });

        setTimeout(handler, getRandomInt(task.timerMin, task.timerMax));
    });
}


module.exports = {
    getMessageFromDB:getMessageFromDB,
    sendMessage: sendMessage,
    readMessage:readMessage,
    insertMessageIntoDB:insertMessageIntoDB
}
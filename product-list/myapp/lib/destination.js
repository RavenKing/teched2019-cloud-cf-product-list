'use strict';
const xsenv = require('@sap/xsenv');
const msg = require('@sap/xb-msg');
const msgenv = require('@sap/xb-msg-env');
const service = 'kevin-em';
const taskList = {
    myOutA : { topic: 'topic-demo' , timerMin: 1, timerMax: 11 }
};
var counter = 1;
//input 
const inputX = process.env.XBEM_INPUT_X;
const reconnect_retry_ms = process.env.RECONNECT_RETRY_MS;

// Get options from CF environment
const options = msgenv.msgClientOptions(service, [inputX], []);
xsenv.loadEnv();

//------------------------------------------------------------------------------------------------------------------
// Start messaging client
//------------------------------------------------------------------------------------------------------------------

let client = null;

function readMessage(res)
{
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

      //------------------------------------------------------------------------------------------------------------------
      // Write the message payload to the log file
      //------------------------------------------------------------------------------------------------------------------

      console.log('message received: ' + message.payload.toString());
      res.send({message:message.payload.toString()});
      message.done();

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
    sendMessage: sendMessage,
    readMessage:readMessage
}
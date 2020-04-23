'use strict';
const xsenv = require('@sap/xsenv');
const msg = require('@sap/xb-msg');
const env = require('@sap/xb-msg-env');
const service = 'kevin-em';
const taskList = {
    myOutA : { topic: 'topic-demo' , timerMin: 1, timerMax: 11 }
};
var counter = 1;

xsenv.loadEnv();

//------------------------------------------------------------------------------------------------------------------
// Start messaging client
//------------------------------------------------------------------------------------------------------------------

let client = new msg.Client(env.msgClientOptions(service, [], ['myOutA']));

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
    sendMessage: sendMessage
}
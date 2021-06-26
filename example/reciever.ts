import { Ack, MessageBroker } from "../src/rabbit"

MessageBroker.getInstance()
    .then((broker: MessageBroker) => {
        broker.subscribe('test', onTest)
    });

function onTest(msg: any, ack: Ack) {
    console.log('Message:', msg.content.toString())
    ack();
};


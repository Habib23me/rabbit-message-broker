import { MessageBroker } from "../src/rabbit"
import readline from 'readline';
import { promisify } from 'util';

async function send(message: any) {
    const broker = await MessageBroker.getInstance()
    await broker.send('test', Buffer.from(JSON.stringify(message)));
    return;
}



async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter Message: ', (msg) => {
        send(msg);
        rl.close();
        main();
    });

}

main();

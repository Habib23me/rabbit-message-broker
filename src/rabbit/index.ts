import amqp, { Channel, Connection } from 'amqplib'
import _ from 'lodash'

export declare type MessageHandler = (msg: any, ack: Ack) => void;
export declare type Ack=()=>void;
/**
 * Broker for async messaging
 */
export class MessageBroker {
  static instance: MessageBroker;
  queues: any;
  connection?: Connection;
  _channel?: Channel;

  get channel(): Channel {
    if (this._channel) {
      return this._channel;
    }
    throw new Error("Channel not created");
  }
  /**
   * Trigger init connection method
   */
  constructor() {
    this.queues = {}
  }


  static async getInstance(): Promise<MessageBroker> {
    if (!MessageBroker.instance) {
      const broker = new MessageBroker();
      await broker.init();
      MessageBroker.instance = broker;
    }
    return MessageBroker.instance;
  };

  /**
   * Initialize connection to rabbitMQ
   */
  async init() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    this._channel = await this.connection.createChannel();
    return this;
  }

  /**
   * Send message to queue
   * @param {String} queue Queue name
   * @param {Object} msg Message as Buffer
   */
  async send(queue: string, msg: any) {
    if (!this.connection) {
      await this.init();
    }
    await this.channel.assertQueue(queue, { durable: true });
    return this.channel.sendToQueue(queue, msg)
  }

  /**
   * @param {String} queue Queue name
   * @param {Function} handler Handler that will be invoked with given message and acknowledge function (msg, ack)
   */
  async subscribe(queue: string, handler: MessageHandler) {
    if (!this.connection) {
      await this.init();
    }
    if (this.queues[queue]) {
      const existingHandler = _.find(this.queues[queue], h => h === handler)
      if (existingHandler) {
        return () => this.unsubscribe(queue, existingHandler)
      }
      this.queues[queue].push(handler)
      return () => this.unsubscribe(queue, handler)
    }

    await this.channel.assertQueue(queue, { durable: true });
    this.queues[queue] = [handler]
    this.channel.consume(
      queue,
      async (msg: any) => {
        const ack = _.once(() => this.channel.ack(msg))
        this.queues[queue].forEach((h: MessageHandler) => h(msg, ack))
      }
    );
    return () => this.unsubscribe(queue, handler)
  }

  async unsubscribe(queue: string, handler: MessageHandler) {
    _.pull(this.queues[queue], handler)
  }
}


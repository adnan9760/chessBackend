import { createClient } from "redis";

export const redisPublisher = createClient();
export const redisSubscriber = createClient();

redisPublisher.connect();
redisSubscriber.connect();

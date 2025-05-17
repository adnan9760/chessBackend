"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSubscriber = exports.redisPublisher = void 0;
const redis_1 = require("redis");
exports.redisPublisher = (0, redis_1.createClient)();
exports.redisSubscriber = (0, redis_1.createClient)();
exports.redisPublisher.connect();
exports.redisSubscriber.connect();

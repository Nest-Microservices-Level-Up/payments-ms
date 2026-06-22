
import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    PAYMENTS_MS_STRIPE_SECRET: string;
    PAYMENTS_MS_STRIPE_SUCCESS_URL: string,
    PAYMENTS_MS_STRIPE_CANCEL_URL: string,
    PAYMENTS_MS_STRIPE_ENDPOINT_SECRET: string,
    NATS_SERVERS: string[];
}

const envSchema = joi.object({
    PORT: joi.number().required(),
    PAYMENTS_MS_STRIPE_SECRET: joi.string().required(),
    PAYMENTS_MS_STRIPE_SUCCESS_URL: joi.string().required(),
    PAYMENTS_MS_STRIPE_CANCEL_URL: joi.string().required(),
    PAYMENTS_MS_STRIPE_ENDPOINT_SECRET: joi.string().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
})
.unknown(true);

const { error, value } = envSchema.validate({
    ...process.env,
    NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if(error){
    throw new Error(`Config validation error ${ error.message }`);
}

const envVars: EnvVars = value;

export const envs = {
    port: envVars.PORT,
    stripeSecret: envVars.PAYMENTS_MS_STRIPE_SECRET,
    stripeSuccessUrl: envVars.PAYMENTS_MS_STRIPE_SUCCESS_URL,
    stripeCancelUrl: envVars.PAYMENTS_MS_STRIPE_CANCEL_URL,
    stripeEndpointSecret: envVars.PAYMENTS_MS_STRIPE_ENDPOINT_SECRET,
    natsServers: envVars.NATS_SERVERS,
}
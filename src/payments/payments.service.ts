import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'node_modules/stripe/esm/stripe.esm.node';
import { envs, NATS_SERVICE } from 'src/config';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {

  private readonly stripe = new Stripe(envs.stripeSecret);

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ){

  }

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId: orderId,
        },
      },

      line_items: lineItems,

      mode: 'payment',

      success_url: envs.stripeSuccessUrl,

      cancel_url: envs.stripeCancelUrl,
    });

  return {
    cancelUrl: session.cancel_url,
    successUrl: session.success_url,
    url: session.url,
  }
  }

  async handleStripeWebHook(request: Request, response: Response) {
    const signature = request.headers['stripe-signature'] as string | undefined;

    if (!signature) {
      return response
        .status(400)
        .json({ message: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    const endpointSecret = envs.stripeEndpointSecret;

    try {
      event = this.stripe.webhooks.constructEvent(
        request['rawBody'],
        signature,
        endpointSecret,
      );
    } catch (error) {
      response
        .status(400)
        .send({ message: `Webhook Error : ${error.message}` });
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceeded = event.data.object;
        const payload = {
          stripePayloadId: chargeSucceeded.id,
          orderId: chargeSucceeded.metadata.orderId,
          receiptUrl: chargeSucceeded.receipt_url,
        }
        this.client.emit('payment.succeeded', payload);
        break;

      default:
        console.log(`Event ${event.type} not handled`);
        break;
    }

    return response.status(200).json({
      signature,
    });
  }
}

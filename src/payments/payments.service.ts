import { Injectable } from '@nestjs/common';
import Stripe from 'node_modules/stripe/esm/stripe.esm.node';
import { envs } from 'src/config';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret);

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

    return session;
  }

  async handleStripeWebHook(request: Request, response: Response) {
    const signature = request.headers['stripe-signature'] as string | undefined;

    if (!signature) {
      return response
        .status(400)
        .json({ message: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    // testing
    // const endpointSecret = 'whsec_bf45599045636f93a3d38b3a1dffe2ae111d08ee61eec84b1bacf70c04bd5f86';

    // Real
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

        console.log({
          metadata: chargeSucceeded.metadata,
          orderId: chargeSucceeded.metadata.orderId,
        });

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

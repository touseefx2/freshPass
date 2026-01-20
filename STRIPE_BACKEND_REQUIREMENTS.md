# Stripe Payment Integration - Backend Requirements

## Overview
Frontend Stripe Payment Sheet integration ke liye backend se yeh endpoints aur data chahiye.

## Required Backend Endpoints

### 1. Payment Sheet Parameters Endpoint

**Endpoint:** `POST /api/stripe/payment-sheet`

**Request Body:**
```json
{
  "plan_id": 123
}
```

**Response Format:**
```json
{
  "paymentIntent": "pi_xxxxx_secret_xxxxx",
  "ephemeralKey": "ek_test_xxxxx",
  "customer": "cus_xxxxx"
}
```

**Response Fields Explanation:**
- `paymentIntent`: Payment Intent client secret (Stripe se generate kiya gaya)
- `ephemeralKey`: Ephemeral key secret (customer ke liye temporary key)
- `customer`: Stripe Customer ID (user ka Stripe customer ID)

**Backend Implementation Steps:**

1. **Request se `plan_id` receive karo**
2. **Plan details fetch karo** (price, name, etc.)
3. **Stripe Customer create/retrieve karo:**
   ```javascript
   // Agar customer nahi hai to create karo
   const customer = await stripe.customers.create({
     email: user.email,
     name: user.name,
     metadata: {
       user_id: user.id
     }
   });
   
   // Ya existing customer retrieve karo
   const customer = await stripe.customers.retrieve(user.stripe_customer_id);
   ```

4. **Ephemeral Key create karo:**
   ```javascript
   const ephemeralKey = await stripe.ephemeralKeys.create(
     { customer: customer.id },
     { apiVersion: '2024-12-18.acacia' } // Latest API version
   );
   ```

5. **Payment Intent create karo:**
   ```javascript
   const paymentIntent = await stripe.paymentIntents.create({
     amount: plan.price * 100, // Convert to cents
     currency: 'usd', // Ya jo currency use kar rahe ho
     customer: customer.id,
     automatic_payment_methods: {
       enabled: true,
     },
     metadata: {
       plan_id: planId,
       user_id: user.id,
     },
   });
   ```

6. **Response return karo:**
   ```json
   {
     "paymentIntent": paymentIntent.client_secret,
     "ephemeralKey": ephemeralKey.secret,
     "customer": customer.id
   }
   ```

### 2. Subscription Confirmation Endpoint

**Endpoint:** `POST /api/subscription-plans/{planId}/subscribe`

**Request Body:**
```json
{
  "plan_id": 123
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Subscription successful!",
  "data": {
    "subscription_id": 456,
    "plan_id": 123,
    "status": "active",
    "expires_at": "2024-12-31T23:59:59Z"
  }
}
```

**Backend Implementation Steps:**

1. **Payment Intent verify karo** (Stripe webhook se ya manually):
   ```javascript
   const paymentIntent = await stripe.paymentIntents.retrieve(
     paymentIntentId
   );
   
   if (paymentIntent.status !== 'succeeded') {
     throw new Error('Payment not completed');
   }
   ```

2. **Subscription create karo database mein:**
   - User ko plan assign karo
   - Subscription record create karo
   - Payment record save karo

3. **Response return karo**

**Note:** Frontend payment sheet ke baad automatically is endpoint ko call karega. Backend ko verify karna chahiye ke payment actually successful hui hai.

## Database Requirements

### User Table
- `stripe_customer_id` (VARCHAR, nullable) - Stripe customer ID store karo

### Subscriptions Table
- `id` (INT, primary key)
- `user_id` (INT, foreign key)
- `plan_id` (INT, foreign key)
- `status` (VARCHAR) - 'active', 'cancelled', 'expired'
- `stripe_payment_intent_id` (VARCHAR, nullable)
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP)

## Error Handling

Backend ko proper error messages return karne chahiye:

**Payment Sheet Endpoint Errors:**
```json
{
  "error": "Plan not found",
  "message": "The requested subscription plan does not exist"
}
```

**Subscription Endpoint Errors:**
```json
{
  "success": false,
  "message": "Payment verification failed"
}
```

## Security Considerations

1. **Authentication:** Dono endpoints ko authenticated user se hi allow karo
2. **Authorization:** Verify karo ke user apne account ke liye hi subscription le raha hai
3. **Payment Verification:** Subscription endpoint pe payment verify karo before creating subscription
4. **Rate Limiting:** Payment endpoints pe rate limiting lagao

## Testing

### Test Cases:
1. ✅ Valid plan_id ke saath payment sheet parameters return kare
2. ✅ Invalid plan_id pe error return kare
3. ✅ Payment successful hone pe subscription create kare
4. ✅ Payment failed hone pe error return kare
5. ✅ Unauthenticated requests ko reject kare

## Stripe Webhook (Optional but Recommended)

Payment verification ke liye Stripe webhook setup karo:

**Webhook Endpoint:** `POST /api/stripe/webhook`

**Events to Handle:**
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed

**Webhook Implementation:**
```javascript
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);

if (event.type === 'payment_intent.succeeded') {
  const paymentIntent = event.data.object;
  // Update subscription status
  // Send confirmation email
}
```

## Environment Variables Required

Backend pe yeh environment variables set karo:

```env
STRIPE_SECRET_KEY=sk_test_xxxxx  # Ya sk_live_xxxxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Webhook signature verification ke liye
```

## Frontend Flow Summary

1. User "Subscribe Now" button click karta hai
2. Frontend `POST /api/stripe/payment-sheet` ko call karta hai with `plan_id`
3. Backend payment sheet parameters return karta hai
4. Frontend Stripe payment sheet open karta hai
5. User payment complete karta hai
6. Frontend `POST /api/subscription-plans/{planId}/subscribe` ko call karta hai
7. Backend subscription create karta hai aur success response return karta hai

## Important Notes

- **Payment Intent Amount:** Amount ko cents mein convert karo (e.g., $10.00 = 1000 cents)
- **Currency:** Default 'usd' use karo, ya jo currency support karni ho
- **API Version:** Ephemeral keys ke liye latest Stripe API version use karo
- **Customer Reuse:** Same user ke liye same Stripe customer ID use karo (database mein store karo)


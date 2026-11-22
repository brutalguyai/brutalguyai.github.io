# Salon booking paid with UPI: sequence diagram

Covers the happy path and a duplicate `payment.captured` webhook. Mermaid renders it on GitHub, in VS Code (with a Mermaid extension) and at mermaid.live.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant P as Booking page
    participant B as Our backend
    participant R as Razorpay
    participant U as UPI app

    rect rgb(240, 245, 255)
    Note over C,R: 1. Create booking and order
    C->>P: Pick service and slot, tap Pay
    P->>B: POST /bookings (service, slot)
    B->>B: Save booking as PENDING_PAYMENT and hold slot for 10 min
    B->>R: Create Order (amount, receipt = booking_id)
    R-->>B: order_id
    B-->>P: order_id, key_id
    end

    rect rgb(245, 255, 245)
    Note over C,U: 2. Customer pays
    P->>R: Open Checkout, customer chooses UPI
    R->>U: UPI intent or collect request
    U->>C: Show amount, ask for UPI PIN
    C->>U: Enter UPI PIN
    U-->>R: Payment authorised (via bank and NPCI)
    R-->>P: Checkout success (payment_id, order_id, signature)
    P->>B: Poll GET /bookings/:id
    B-->>P: PENDING_PAYMENT (not confirmed yet)
    Note right of P: The browser callback is NOT trusted to confirm.<br/>Only the webhook confirms the booking.
    end

    rect rgb(255, 250, 235)
    Note over B,R: 3. Webhook confirms booking (first delivery)
    R->>B: POST /webhooks/razorpay payment.captured (X-Razorpay-Event-Id: evt_1)
    B->>B: Verify HMAC signature on raw body
    B->>B: In one DB transaction:<br/>INSERT evt_1 into processed_events (unique key)<br/>UPDATE booking SET CONFIRMED WHERE status = PENDING_PAYMENT
    B-->>R: 200 OK
    B--)C: Send confirmation (SMS / WhatsApp)
    P->>B: Poll GET /bookings/:id
    B-->>P: CONFIRMED
    P-->>C: Show booking confirmed
    end

    rect rgb(255, 240, 240)
    Note over B,R: 4. Duplicate webhook (same event delivered again)
    Note over R,B: Typical cause: our 200 was slow or lost, so Razorpay retries
    R->>B: POST /webhooks/razorpay payment.captured (X-Razorpay-Event-Id: evt_1)
    B->>B: Verify HMAC signature on raw body (valid)
    B->>B: INSERT evt_1 into processed_events
    alt evt_1 already exists (unique violation)
        B->>B: Skip. No status change, no second confirmation message
        B-->>R: 200 OK (so Razorpay stops retrying)
    else Unexpected failure (DB down)
        B-->>R: 500
        Note over R,B: Razorpay retries later and the handler runs again safely
    end
    end
```

## Why the duplicate is harmless

- **Dedupe key:** the `X-Razorpay-Event-Id` header is stored in `processed_events` with a unique constraint. The database enforces "once only", even if two copies arrive at the same moment on different servers.
- **Same transaction as the state change:** the dedupe row and the booking update commit or roll back together. A crash cannot leave the event marked processed with the booking unconfirmed.
- **Guarded update:** `WHERE status = PENDING_PAYMENT` makes the booking update idempotent even if the dedupe table is bypassed.
- **Always return 200 for a known duplicate:** a 4xx or 5xx would make Razorpay keep retrying.
- **Side effects run once:** the confirmation message is sent only when the transaction actually changed the booking, not on a duplicate.

## Assumptions to check against your system

- The slot hold is 10 minutes. Use your real value. If the webhook arrives after the hold expires, you need a refund or re-book path. That path is not shown here.
- The page polls for status. You could use a websocket or server-sent events instead.
- Razorpay talks to the UPI app through the bank and NPCI. This is collapsed into one arrow.
- The confirmation message is sent inline after the commit. A queue or outbox would be more robust.

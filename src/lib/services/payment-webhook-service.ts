import crypto from 'node:crypto';

export interface WebhookVerificationOptions {
  payload: string;
  signature: string;
  secret: string;
  timestamp?: number;
  toleranceSeconds?: number;
}

export interface PaymentWebhookPayload {
  event: 'payment.captured' | 'payment.failed';
  institution_id: string;
  assignment_id: string;
  amount_minor_units: number;
  payment_method: string;
  idempotency_key: string;
  gateway_reference: string;
  timestamp?: number;
}

export interface PaymentWebhookResult {
  status: 200 | 400 | 401 | 500;
  success: boolean;
  error?: string;
  payment_id?: string;
  is_duplicate?: boolean;
  amount_minor_units?: number;
}

/**
 * Generates an HMAC SHA-256 signature for a webhook payload.
 * When timestamp is provided, signs `${timestamp}.${payload}` per Razorpay / Stripe standard.
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: number
): string {
  const contentToSign = timestamp ? `${timestamp}.${payload}` : payload;
  return crypto.createHmac('sha256', secret).update(contentToSign).digest('hex');
}

/**
 * Validates a webhook HMAC SHA-256 signature and checks replay protection window.
 * Uses crypto.timingSafeEqual to prevent timing side-channel attacks.
 */
export function verifyWebhookSignature({
  payload,
  signature,
  secret,
  timestamp,
  toleranceSeconds = 300, // 5 minutes default
}: WebhookVerificationOptions): { isValid: boolean; error?: string } {
  if (!signature || !secret || !payload) {
    return { isValid: false, error: 'MISSING_SIGNATURE_OR_SECRET' };
  }

  // 1. Replay attack mitigation: verify timestamp freshness
  if (timestamp !== undefined) {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    if (diff > toleranceSeconds) {
      return { isValid: false, error: 'TIMESTAMP_EXPIRED' };
    }
  }

  // 2. Compute expected HMAC SHA-256 digest
  const expectedSignature = generateWebhookSignature(payload, secret, timestamp);

  // 3. Timing-safe comparison to prevent side-channel timing analysis
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { isValid: false, error: 'INVALID_SIGNATURE_LENGTH' };
    }

    const matches = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!matches) {
      return { isValid: false, error: 'INVALID_SIGNATURE' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'MALFORMED_SIGNATURE' };
  }
}

/**
 * Core Payment Webhook Ingestion Engine
 * Verifies cryptographic signatures, protects against replay attacks,
 * and calls public.rpc_record_fee_payment to record ledger payment.
 */
export async function processPaymentWebhook(
  db: { query: <T = unknown>(sql: string) => Promise<{ rows: T[] }> },
  options: {
    payloadRaw: string;
    signatureHeader: string;
    secret: string;
    timestampHeader?: number;
  }
): Promise<PaymentWebhookResult> {
  const { payloadRaw, signatureHeader, secret, timestampHeader } = options;

  // 1. Verify Cryptographic Signature
  const verification = verifyWebhookSignature({
    payload: payloadRaw,
    signature: signatureHeader,
    secret,
    timestamp: timestampHeader,
  });

  if (!verification.isValid) {
    return {
      status: 401,
      success: false,
      error: verification.error || 'UNAUTHORIZED_WEBHOOK_SIGNATURE',
    };
  }

  // 2. Parse and Validate Webhook Payload Body
  let payload: PaymentWebhookPayload;
  try {
    payload = JSON.parse(payloadRaw) as PaymentWebhookPayload;
  } catch {
    return {
      status: 400,
      success: false,
      error: 'MALFORMED_JSON_PAYLOAD',
    };
  }

  if (
    !payload.assignment_id ||
    !payload.amount_minor_units ||
    !payload.idempotency_key ||
    payload.amount_minor_units <= 0
  ) {
    return {
      status: 400,
      success: false,
      error: 'INVALID_PAYLOAD_PARAMETERS',
    };
  }

  // Only process successful capture events
  if (payload.event !== 'payment.captured') {
    return {
      status: 200,
      success: true,
      error: 'EVENT_IGNORED',
    };
  }

  // 3. Atomically Record Fee Payment in PostgreSQL Ledger
  try {
    const res = await db.query<{ rpc_record_fee_payment: any }>(`
      SELECT public.rpc_record_fee_payment(
        '${payload.assignment_id}'::UUID,
        ${payload.amount_minor_units}::BIGINT,
        '${payload.payment_method.replace(/'/g, "''")}',
        '${payload.idempotency_key.replace(/'/g, "''")}',
        '${(payload.gateway_reference || 'GW_REF_DEFAULT').replace(/'/g, "''")}'
      ) as rpc_record_fee_payment;
    `);

    const rpcResult = res.rows[0]?.rpc_record_fee_payment;
    if (!rpcResult || !rpcResult.success) {
      return {
        status: 500,
        success: false,
        error: 'PAYMENT_RECORDING_FAILED',
      };
    }

    return {
      status: 200,
      success: true,
      payment_id: rpcResult.payment_id,
      is_duplicate: Boolean(rpcResult.is_duplicate),
      amount_minor_units: rpcResult.amount_minor_units,
    };
  } catch (err: any) {
    return {
      status: 500,
      success: false,
      error: err?.message || 'DATABASE_MUTATION_ERROR',
    };
  }
}

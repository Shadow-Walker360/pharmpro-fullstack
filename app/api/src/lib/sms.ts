// ════════════════════════════════════════════════════════════
// lib/sms.ts — Africa's Talking SMS wrapper
// ════════════════════════════════════════════════════════════

import AfricasTalking from 'africastalking'
import { env }        from '../config/env'
import { logger }     from './logger'

const AT = AfricasTalking({
  apiKey:   env.AT_API_KEY ?? 'sandbox-key',
  username: env.AT_USERNAME,
})

const sms = AT.SMS

export const smsService = {
  async send({ to, message }: { to: string; message: string }) {
    if (!env.AT_API_KEY) {
      logger.info({ to, message }, '[SMS DRY RUN] Would send SMS')
      return
    }

    try {
      // Normalize Kenyan numbers: 07XX → +2547XX
      const normalized = to.startsWith('0')
        ? `+254${to.slice(1)}`
        : to.startsWith('254')
        ? `+${to}`
        : to

      const result = await sms.send({
        to:      [normalized],
        message,
        from:    env.AT_SENDER_ID,
      })

      logger.info({ to: normalized, status: result.SMSMessageData?.Recipients?.[0]?.status }, 'SMS sent')
      return result
    } catch (err) {
      logger.error({ err, to }, 'SMS failed')
      throw err // BullMQ will retry
    }
  },
}



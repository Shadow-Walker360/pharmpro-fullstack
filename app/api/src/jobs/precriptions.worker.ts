// ════════════════════════════════════════════════════════════
// jobs/prescriptions.worker.ts
// Handles all prescription-related async work
// ════════════════════════════════════════════════════════════

import { Worker, Job } from 'bullmq'
import { redis }       from '../config/redis'
import { prisma }      from '../config/prisma'
import { logger }      from '../lib/logger'
import { smsService }  from '../lib/sms'  // Africa's Talking wrapper

export function startPrescriptionsWorker() {
  const worker = new Worker(
    'prescriptions',
    async (job: Job) => {
      logger.info({ jobName: job.name, jobId: job.id }, 'Processing prescription job')

      switch (job.name) {

        case 'rx-created-sms': {
          const { patientId, rxNumber, priority } = job.data
          const patient = await prisma.patient.findUnique({
            where:  { id: patientId },
            select: { phone: true, firstName: true },
          })
          if (!patient?.phone) {
            logger.info({ patientId }, 'Patient has no phone — skipping SMS')
            return
          }
          await smsService.send({
            to:      patient.phone,
            message: priority === 'EMERGENCY'
              ? `PharmPro: URGENT - Your prescription ${rxNumber} is being processed immediately. Please wait.`
              : `PharmPro: Your prescription ${rxNumber} has been received. We will notify you when it is ready for collection.`,
          })
          break
        }

        case 'dispense-sms': {
          const { patientId, rxNumber } = job.data
          const patient = await prisma.patient.findUnique({
            where:  { id: patientId },
            select: { phone: true, firstName: true },
          })
          if (!patient?.phone) return
          await smsService.send({
            to:      patient.phone,
            message: `PharmPro: ${patient.firstName}, your prescription ${rxNumber} is ready for collection. Please bring this SMS. Thank you!`,
          })
          break
        }

        case 'dispense-receipt': {
          // In a full build, generate PDF receipt and store to S3
          // For now, just log
          logger.info({ prescriptionId: job.data.prescriptionId }, 'Receipt generation queued')
          break
        }

        default:
          logger.warn({ jobName: job.name }, 'Unknown prescription job type')
      }
    },
    {
      connection: redis,
      concurrency: 10,       // process 10 SMS jobs simultaneously
      limiter: {
        max:      50,         // max 50 jobs
        duration: 1000,       // per second (Africa's Talking rate limit)
      },
    },
  )

  worker.on('completed', job => logger.info({ jobId: job.id, name: job.name }, 'Job completed'))
  worker.on('failed',    (job, err) => logger.error({ jobId: job?.id, err }, 'Job failed'))

  return worker
}



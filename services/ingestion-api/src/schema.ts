import { z} from 'zod';

export const eventSchema = z.object( {

    userId: z.string().min(1, 'userId is required'),
    eventType: z.enum( [

        'FOCUS_SESSION',
        'TAB_SWITCH',
        'APP_OPEN',
        'WHATSAPP_MESSAGE',
        'STUDY_SESSION',
        'IDLE_TIME'
    ]),

    timestamp: z.number().positive('timestamp cannot be negative. it must be positive'),
    duration: z.number().positive().optional(),
    metadata: z.record(z.any(), z.string().default(' ')).optional(),
});

export type EventInput = z.infer<typeof eventSchema>;

export interface EnrichedEvent extends EventInput {
    eventId: string,
    receivedAt: number,
    source: string,
}
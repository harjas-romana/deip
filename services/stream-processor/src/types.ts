export interface EnrichedEvent {
    eventId: string;
    userId: string;
    eventType: 'FOCUS_SESSION' | 'TAB_SWITCH' | 'APP_OPEN' | 'WHATSAPP_MESSAGE' | 'STUDY_SESSION' | 'IDLE_TIME';
    timestamp: number;
    duration?: number;
    metadata?: Record<string, any>;
    receivedAt: number;
    source: string;
}

export interface DailyAggregate {
    userId: string;
    date: string;
    focusTime: number;
    idleTime: number;
    tabSwitches: number;
    appOpens: number;
    whatsappMessages: number;
    studySessions: number;
    eventCount: number;
}
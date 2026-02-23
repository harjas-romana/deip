import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.errors({stack: true}),
        winston.format.json()
    ),

    transports: [

        //Output of the console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({timestamp, level, message, ...meta}) => {

                    return `${timestamp} [${level}]: ${message} ${
                        Object.keys(meta).length ? JSON.stringify(meta, null,2) : ''
                    }`;

                })
            ),
        }),

        //output of the file, json for parsingg
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.json(),
        }),

        new winston.transports.File( {
            filename: 'logs/combined.log',
            format: winston.format.json(),
        }),
    ],
});


export default logger;
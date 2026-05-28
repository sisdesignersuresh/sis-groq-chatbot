import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

/* =========================
   CORS
========================= */

app.use(cors({
    origin: '*'
}));

/* =========================
   JSON
========================= */

app.use(express.json());

/* =========================
   CHAT MEMORY
========================= */

const conversations = {};

/* =========================
   CHAT API
========================= */

app.post('/chat', async (req, res) => {

    try {

        const userMessage = req.body.message;
        const userId = req.body.userId || 'website-user';

        console.log("User:", userMessage);

        /* =========================
           CREATE CHAT MEMORY
        ========================= */

        if (!conversations[userId]) {

            conversations[userId] = [

                {
                    role: 'system',

                    content: `
                    You are SIS International Recruiters AI assistant.

                    COMPANY INFORMATION:

                    SIS International Recruiters recruits candidates for:

                    - Croatia
                    - Serbia
                    - Bulgaria
                    - North Macedonia
                    - Albania
                    - Montenegro

                    AVAILABLE JOB CATEGORIES:

                    - Waiter
                    - Hospitality
                    - Carpenter
                    - Construction
                    - Factory Worker
                    - Hotel Staff
                    - General Labour
                    - Skilled Workers
                    - Unskilled Workers

                    SALARY DETAILS:

                    - Unskilled Jobs:
                      800 to 900 Euros

                    - Skilled Jobs:
                      900 to 1200 Euros

                    REQUIRED DOCUMENTS:

                    - Passport
                    - Education Certificates
                    - Experience Certificates
                    - Trade Certificates
                    - PCC

                    VISA PROCESS:

                    1. Candidate shares:
                       - Passport
                       - Education Certificates
                       - Experience Certificates
                       - Trade Certificates
                       - PCC

                    2. SIS team checks profile
                       and job availability.

                    3. Employer interview
                       will be scheduled.

                    4. After selection:
                       - Offer Letter
                       - Work Permit
                       - Visa Process
                       will begin.

                    5. SIS team guides the
                       candidate until visa stamping.

                    6. Processing time:
                       Usually 2 to 6 months
                       depending on country
                       and job category.

                    IMPORTANT RULES:

                    - Remember previous conversation.
                    - Never ask repeated questions.
                    - If user already mentioned
                      country or job role,
                      continue naturally.

                    - Reply like a real
                      recruitment consultant.

                    - Keep replies:
                      short,
                      professional,
                      clear and friendly.

                    - Guide candidates step by step.

                    - If candidate asks salary:
                      mention:
                      Skilled Jobs:
                      900-1200 Euros

                      Unskilled Jobs:
                      800-900 Euros

                    - If candidate asks documents:
                      mention:
                      Passport,
                      Education Certificates,
                      Experience Certificates,
                      Trade Certificates,
                      PCC.

                    - If candidate asks countries:
                      mention only:
                      Croatia,
                      Serbia,
                      Bulgaria,
                      North Macedonia,
                      Albania,
                      Montenegro.

                    - If candidate asks visa process:
                      explain properly step-by-step.

                    - Do not give fake promises.

                    - Speak naturally like
                      a human recruiter.
                    `
                }

            ];

        }

        /* =========================
           SAVE USER MESSAGE
        ========================= */

        conversations[userId].push({

            role: 'user',
            content: userMessage

        });

        /* =========================
           GROQ API
        ========================= */

        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {

                method: 'POST',

                headers: {

                    'Authorization':
                    `Bearer ${process.env.GROQ_API_KEY}`,

                    'Content-Type':
                    'application/json'

                },

                body: JSON.stringify({

                    model: 'llama-3.3-70b-versatile',

                    messages: conversations[userId],

                    temperature: 0.7,

                    max_tokens: 500

                })

            }
        );

        const data = await response.json();

        console.log("Groq Response:", data);

        /* =========================
           ERROR
        ========================= */

        if (data.error) {

            return res.json({
                reply: data.error.message
            });

        }

        /* =========================
           BOT REPLY
        ========================= */

        const botReply =
            data.choices[0].message.content;

        /* =========================
           SAVE AI REPLY
        ========================= */

        conversations[userId].push({

            role: 'assistant',
            content: botReply

        });

        /* =========================
           LIMIT MEMORY
        ========================= */

        if (conversations[userId].length > 20) {

            conversations[userId] =
                conversations[userId].slice(-20);

        }

        /* =========================
           RESPONSE
        ========================= */

        res.json({
            reply: botReply
        });

    } catch (error) {

        console.log(error);

        res.json({
            reply:
            'AI server issue. Please try again.'
        });

    }

});

/* =========================
   HOME PAGE
========================= */

app.get('/', (req, res) => {

    res.send('SIS AI Chatbot Running');

});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Server running on ${PORT}`
    );

});

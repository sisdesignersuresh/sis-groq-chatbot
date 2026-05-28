import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
    origin: '*'
}));

app.use(express.json());

/* =========================
   CHAT MEMORY STORAGE
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
           CREATE MEMORY
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

                    IMPORTANT RULES:

                    - Remember previous conversation.
                    - Never ask repeated questions.
                    - If user already mentioned country or job role,
                      continue naturally.
                    - Reply like a real recruitment consultant.
                    - Keep replies short, professional and friendly.
                    - Guide candidates step by step.
                    - If candidate asks salary,
                      mention:
                      Skilled: 900-1200 Euros
                      Unskilled: 800-900 Euros

                    - If candidate asks documents,
                      mention all required documents.

                    - If candidate asks countries,
                      mention only:
                      Croatia, Serbia, Bulgaria,
                      North Macedonia, Albania,
                      Montenegro.

                    - Do not give fake promises.
                    - Keep answers clear and direct.
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
           GROQ API REQUEST
        ========================= */

        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {

                method: 'POST',

                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
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
           ERROR HANDLING
        ========================= */

        if (data.error) {

            return res.json({
                reply: data.error.message
            });

        }

        /* =========================
           SAVE AI REPLY
        ========================= */

        const botReply = data.choices[0].message.content;

        conversations[userId].push({
            role: 'assistant',
            content: botReply
        });

        /* =========================
           LIMIT MEMORY SIZE
        ========================= */

        if (conversations[userId].length > 20) {

            conversations[userId] =
                conversations[userId].slice(-20);

        }

        /* =========================
           SEND RESPONSE
        ========================= */

        res.json({
            reply: botReply
        });

    } catch (error) {

        console.log(error);

        res.json({
            reply: 'AI server issue. Please try again.'
        });

    }

});

/* =========================
   ROOT API
========================= */

app.get('/', (req, res) => {

    res.send('SIS AI Chatbot Running');

});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Server running on ${PORT}`);

});

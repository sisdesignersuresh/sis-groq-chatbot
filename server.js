import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {

    try {

        const userMessage = req.body.message;

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

                    messages: [

                        {
                            role: 'system',

                            content: `
                            You are SIS International Recruiters AI assistant.

                            You help candidates with:
                            - Croatia jobs
                            - Serbia jobs
                            - Greece jobs
                            - Europe recruitment
                            - Hospitality jobs
                            - Construction jobs
                            - Nursing jobs

                            Reply professionally.
                            Keep answers short.
                            Encourage WhatsApp contact.
                            `
                        },

                        {
                            role: 'user',
                            content: userMessage
                        }

                    ]

                })

            }
        );

        const data = await response.json();

        res.json({
            reply: data.choices[0].message.content
        });

    } catch (error) {

        console.log(error);

        res.json({
            reply: 'Server error'
        });

    }

});

app.get('/', (req, res) => {
    res.send('SIS AI Chatbot Running');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
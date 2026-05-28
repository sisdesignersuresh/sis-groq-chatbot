import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
    origin: '*'
}));

app.use(express.json());

app.post('/chat', async (req, res) => {

    try {

        const userMessage = req.body.message;

        console.log("User:", userMessage);

        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',

                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    model: 'llama3-8b-8192',

                    messages: [

                        {
                            role: 'system',

                            content: `
                            You are SIS International Recruiters AI assistant.

                            Help candidates with:
                            - Croatia jobs
                            - Serbia jobs
                            - Europe recruitment
                            - Hospitality jobs
                            - Construction jobs
                            - Visa process

                            Reply professionally and briefly.
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

        console.log("Groq Response:", data);

        if(data.error){

            return res.json({
                reply: data.error.message
            });

        }

        res.json({
            reply: data.choices[0].message.content
        });

    } catch (error) {

        console.log(error);

        res.json({
            reply: 'AI server issue. Please try again.'
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

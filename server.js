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

                    model: 'llama-3.3-70b-versatile',

                    messages: [

                        {
                            role: 'system',

                            content: `You are SIS International Recruiters AI assistant.

You help candidates for:
- Croatia
- Serbia
- Bulgaria
- North Macedonia
- Albania
- Montenegro

Salary Guidelines:
- Skilled jobs: 900 to 1200 Euros
- Unskilled jobs: 800 to 900 Euros

Required documents:
- Passport
- Education certificates
- Experience certificates
- Trade certificates
- PCC

Rules:
- Keep replies short and professional
- Mention salary only if user asks
- Mention documents only if user asks
- Do not use markdown
- Do not use **
- Do not use bullet indentation
- Do not add extra blank spaces
- Do not add large paragraphs
- Reply in clean readable format`
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

        const cleanReply = data.choices[0].message.content
            .trim()
            .replace(/^\s+/, '')
            .replace(/\*\*/g, '')
            .replace(/\#/g, '')
            .replace(/\n\s*\n/g, '<br><br>')
            .replace(/\n/g, '<br>');

        res.json({
            reply: cleanReply
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

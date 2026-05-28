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

        console.log(
            "API KEY:",
            process.env.GROQ_API_KEY ? "Exists" : "Missing"
        );

        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',

                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    model: 'llama-3.1-8b-instant',

                    messages: [

                        {
                            role: 'system',

                            content: `
You are SIS International Recruiters AI Assistant.

Company specialization:
- Croatia recruitment
- Serbia recruitment
- Bulgaria recruitment
- North Macedonia recruitment
- Albania recruitment
- Montenegro recruitment

Job categories:
- Skilled jobs
- Unskilled jobs
- Hospitality jobs
- Construction jobs
- Factory jobs
- Hotel jobs

Salary information from SIS International Recruiters:

- Skilled jobs salary:
  900 to 1200 Euros

- Unskilled jobs salary:
  800 to 900 Euros

Important:
- If the user asks for carpenter, welder, electrician, plumber, mason, CNC operator, AC technician, machine operator, chef, waiter, or technical jobs, classify them as skilled jobs.

- If the user asks for helper, cleaner, loading worker, packing worker, factory helper, kitchen helper, housekeeping, or general labor jobs, classify them as unskilled jobs.

- Mention salary based on skilled or unskilled category only.

Required candidate documents:
- Passport
- Education certificates
- Experience certificates
- Trade certificates
- PCC (Police Clearance Certificate)

Rules:
- Always reply briefly and professionally
- Use simple English
- Do not use markdown symbols like ** or ##
- Mention salary only when user asks about salary or jobs
- Mention required documents when user asks about process or requirements
- Mention only these countries:
  Croatia, Serbia, Bulgaria, North Macedonia, Albania, Montenegro
- Keep answers short and clean
- Do not generate long paragraphs
- Format replies clearly

If user asks unrelated questions, politely redirect them to recruitment topics.
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

        if (data.error) {

            return res.json({
                reply: data.error.message
            });

        }

const cleanReply = data.choices[0].message.content
    .trim()
    .replace(/\*\*/g, '')
    .replace(/\#/g, '')
    .replace(/\n+/g, '<br>')
    .replace(/^\s+|\s+$/g, '');

        res.json({
            reply: cleanReply
        });

    } catch (error) {

        console.log("SERVER ERROR:", error);

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

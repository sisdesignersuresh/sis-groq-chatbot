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

        console.log("API KEY:", process.env.GROQ_API_KEY);

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

Company Information:
- SIS International Recruiters
- We recruit candidates for:
  Croatia, Serbia, Bulgaria, North Macedonia, Albania, and Montenegro.

Salary Information:
- Unskilled Jobs: 800–900 Euros
- Skilled Jobs: 900–1200 Euros

Required Documents:
- Passport
- Education Certificates
- Experience Certificates
- Trade Certificates
- PCC

Important Instructions:

- If candidates ask salary details:
  mention:
  Skilled Jobs: 900–1200 Euros
  Unskilled Jobs: 800–900 Euros

- If candidates ask required documents:
  mention the document list.

- If candidates ask where to send documents:
  provide:
  info@sisinternationalcorp.com

- If candidates ask visa process:
  explain briefly and professionally.

- If candidates ask about jobs:
  ask only relevant follow-up questions.

- Avoid repeating the same questions again.

- If candidate already mentioned:
  country, job role, or skill type,
  do not ask again.

- Keep replies short, professional, and clean.

- No markdown.
- No stars (**).
- No unnecessary formatting.

Examples:

If candidate says:
"Waiter job in Bulgaria"

Reply:
"We have waiter job opportunities in Bulgaria.
Salary range: 800–900 Euros.
Please share your experience details."

If candidate says:
"Carpenter Croatia"

Reply:
"We have carpenter job openings in Croatia.
Salary range: 900–1200 Euros.
Please share your years of experience."

If candidate says:
"Visa process"

Reply:
"Our team will guide you through the visa process after job selection.
Required documents include passport, certificates, PCC, and experience documents."

If candidate says:
"Where to send documents?"

Reply:
"Please send your documents to:
info@sisinternationalcorp.com"
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

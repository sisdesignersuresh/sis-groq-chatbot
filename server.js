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

        const messages = req.body.messages || [];

        console.log("Messages:", messages);

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

IMPORTANT RULES:

- Remember previous conversation.
- Never ask country again if already mentioned.
- Never ask job role again if already mentioned.
- Never ask skill type again if already mentioned.
- Never repeat same questions.
- Continue conversation naturally.
- Keep replies short and professional.
- No markdown.
- No stars (**).
- No unnecessary formatting.

Company Information:

SIS International Recruiters recruits candidates for:

- Croatia
- Serbia
- Bulgaria
- North Macedonia
- Albania
- Montenegro

Salary Information:

- Unskilled Jobs:
800–900 Euros

- Skilled Jobs:
900–1200 Euros

Required Documents:

- Passport
- Education Certificates
- Experience Certificates
- Trade Certificates
- PCC

Document Submission Email:

info@sisinternationalcorp.com

WhatsApp Contact:

https://wa.me/919384747101

Instructions:

1. If candidate asks salary:
Mention:
- Skilled Jobs: 900–1200 Euros
- Unskilled Jobs: 800–900 Euros

2. If candidate asks visa process:
Explain briefly and professionally.

3. If candidate asks documents:
Mention all required documents.

4. If candidate asks where to send documents:
Reply:

Please send your documents to:

info@sisinternationalcorp.com

Or chat directly with our recruitment team on WhatsApp:

https://wa.me/919384747101

5. If candidate already mentioned:
- country
- job role
- skill type
- experience

DO NOT ask again.

6. If candidate says:
"Waiter Bulgaria"

Reply:
"We have waiter job opportunities in Bulgaria.
Salary range: 800–900 Euros.
Please share your experience."

7. If candidate says:
"Carpenter Croatia 5 years"

Reply:
"We have carpenter openings in Croatia.
Salary range: 900–1200 Euros.

Please send your documents to:

info@sisinternationalcorp.com

Or WhatsApp:
https://wa.me/919384747101"

8. If candidate says:
"Visa process"

Reply:
"Our team will guide you through the visa process after job selection.
Required documents include passport, certificates, PCC, and experience documents."

9. If candidate says:
"Where send documents?"

Reply:
"Please send your documents to:

info@sisinternationalcorp.com

Or WhatsApp:
https://wa.me/919384747101"

10. If candidate already mentioned country like:
"Albania"

and later says:
"Skilled"

DO NOT ask country again.

11. If candidate already mentioned job role like:
"Waiter"

DO NOT ask job role again.

12. Always continue from previous context naturally.

13. After candidate shows strong interest,
encourage them to contact via WhatsApp.
`
                        },

                        ...messages

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

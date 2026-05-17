import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
    try {
        const { subject, from } = await req.json()

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are an email categorization assistant. 
          Categorize the email into exactly ONE of these categories:
          Important, Work, Finance, Newsletter, Spam, Personal, Automated
          
          Reply with ONLY the category name. Nothing else.`,
                },
                {
                    role: 'user',
                    content: `From: ${from}\nSubject: ${subject}`,
                },
            ],
            max_tokens: 10,
        })

        const category = completion.choices[0]?.message?.content?.trim() || 'Uncategorized'
        return NextResponse.json({ category })

    } catch (error) {
        console.error('Categorize error:', error)
        return NextResponse.json({ error: 'Failed to categorize' }, { status: 500 })
    }
}
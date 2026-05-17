import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { prompt } = body

        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
        }

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional email writing assistant. Write professional, clear, and concise emails. Return only the email body text. Do not include subject line, preamble, or extra explanation.',
                },
                {
                    role: 'user',
                    content: prompt.trim(),
                },
            ],
            max_tokens: 1024,
        })

        const draft = completion.choices[0]?.message?.content || ''
        return NextResponse.json({ draft })

    } catch (error) {
        console.error('Groq API error:', error)
        return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
    }
}
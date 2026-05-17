import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { emailBody, emailFrom, emailSubject } = await req.json()

    if (!emailBody && !emailSubject) {
      return NextResponse.json({ error: 'Email content is required' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional email assistant. Write a professional reply to the email below. Return only the reply body text — no subject line, no "Re:", no preamble, no sign-off instructions.',
        },
        {
          role: 'user',
          content: `From: ${emailFrom ?? 'Unknown'}\nSubject: ${emailSubject ?? ''}\n\n${emailBody ?? ''}`,
        },
      ],
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content ?? ''
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI reply error:', error)
    return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 })
  }
}

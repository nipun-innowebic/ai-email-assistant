import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    try {
        const auth = new google.auth.OAuth2()
        auth.setCredentials({ access_token: session.accessToken })

        const gmail = google.gmail({ version: "v1", auth })

        const response = await gmail.users.messages.list({
            userId: "me",
            maxResults: 20,
            labelIds: ["INBOX"],
        })

        const messages = response.data.messages || []

        const emailDetails = await Promise.all(
            messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "metadata",
                    metadataHeaders: ["Subject", "From", "Date"],
                })

                const headers = detail.data.payload?.headers || []
                const subject = headers.find(h => h.name === "Subject")?.value || "No Subject"
                const from = headers.find(h => h.name === "From")?.value || "Unknown"
                const date = headers.find(h => h.name === "Date")?.value || ""

                return { id: msg.id, subject, from, date }
            })
        )

        return NextResponse.json({ emails: emailDetails })
    } catch (error) {
        console.error("Gmail API error:", error)
        return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }
}
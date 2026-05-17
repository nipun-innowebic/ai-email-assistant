import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { google } from "googleapis"
import fs from "fs"
import path from "path"

const dataPath = path.join(process.cwd(), "src/data/scheduled.json")

function getScheduled() {
    if (!fs.existsSync(dataPath)) return []
    return JSON.parse(fs.readFileSync(dataPath, "utf-8"))
}

function saveScheduled(data: any[]) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const emails = getScheduled()
    const now = new Date()
    let sentCount = 0

    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ access_token: session.accessToken })
    const gmail = google.gmail({ version: "v1", auth })

    const updated = await Promise.all(
        emails.map(async (email: any) => {
            if (
                email.status === "scheduled" &&
                new Date(email.scheduledAt) <= now
            ) {
                try {
                    const message = [
                        `To: ${email.to}`,
                        `Subject: ${email.subject}`,
                        `Content-Type: text/plain; charset=utf-8`,
                        ``,
                        email.body,
                    ].join("\n")

                    const encoded = Buffer.from(message)
                        .toString("base64")
                        .replace(/\+/g, "-")
                        .replace(/\//g, "_")
                        .replace(/=+$/, "")

                    await gmail.users.messages.send({
                        userId: "me",
                        requestBody: { raw: encoded },
                    })

                    sentCount++
                    return { ...email, status: "sent" }
                } catch (err) {
                    console.error("Send failed:", err)
                    return { ...email, status: "failed" }
                }
            }
            return email
        })
    )

    saveScheduled(updated)
    return NextResponse.json({ sent: sentCount, total: emails.length })
}
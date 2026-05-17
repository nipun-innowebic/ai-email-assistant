"use client"
import { signIn } from "next-auth/react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">
          AI Email Assistant
        </h1>
        <p className="text-gray-400 text-lg">
          Connect your Gmail to get started
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  )
}
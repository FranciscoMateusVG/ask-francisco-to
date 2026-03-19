import { RequestForm } from '@/components/RequestForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-800 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-white text-3xl font-bold mb-2">✉️ Ask Francisco To...</h1>
      <p className="text-purple-200 text-sm mb-8">Need something done? Leave your request below 👋</p>
      <RequestForm />
    </main>
  )
}

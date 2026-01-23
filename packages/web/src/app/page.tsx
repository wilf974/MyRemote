export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">MyRemote</h1>
        <p className="text-xl text-gray-600 mb-8">
          Secure Remote Support Platform
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition"
          >
            Get Started
          </a>
          <a
            href="/docs"
            className="inline-block bg-secondary text-white px-6 py-3 rounded-lg hover:bg-secondary-dark transition"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  )
}

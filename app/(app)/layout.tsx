import Nav from '@/components/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="max-w-md mx-auto px-4 pt-8 pb-24">
        {children}
      </main>
      <Nav />
    </>
  )
}

"use client"

export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="flex items-center justify-between p-4 sm:p-6">
        <h1 className="text-2xl text-white font-semibold">Flarius</h1>
        <a
          className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
          href="/login"
          rel="noopener noreferrer"
        >
          Anmelden
        </a>
      </div>
    </nav>
  );
}
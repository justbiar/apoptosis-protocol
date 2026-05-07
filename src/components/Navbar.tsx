import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pitch', label: 'Pitch Deck' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Add scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled 
          ? 'bg-[#0B0B0B]/80 backdrop-blur-xl border-[#272A2A] py-3' 
          : 'bg-transparent border-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* Premium Logo */}
        <Link to="/" className="flex items-center gap-4 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#272A2A] to-[#0B0B0B] border border-white/10 group-hover:border-[#CC6437]/50 transition-colors duration-500 overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-[#CC6437]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-4 h-4 rounded-sm border-[2px] border-white group-hover:scale-110 transition-transform duration-500 flex items-center justify-center rotate-45">
               <div className="w-1.5 h-1.5 bg-[#CC6437] rounded-full" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-body text-xl font-bold tracking-tight text-white leading-none">
              Apoptosis<span className="text-[#CC6437]">.</span>
            </span>
            <span className="font-mono text-[10px] text-[#858585] uppercase tracking-widest mt-1 group-hover:text-white/70 transition-colors">
              Protocol
            </span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {links.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  to={href}
                  className={`relative font-body text-[14px] font-medium tracking-wide transition-all duration-300 py-2 ${
                    active ? 'text-white' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#CC6437] rounded-full shadow-[0_0_8px_rgba(204,100,55,0.6)]" />
                  )}
                </Link>
              )
            })}
          </div>
          
          <div className="h-6 w-[1px] bg-[#272A2A]" />

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-2 font-mono text-sm font-semibold tracking-wide px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white hover:text-[#0B0B0B] transition-all duration-300"
          >
            <span>GitHub</span>
            <svg 
              className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10 rounded-full bg-[#272A2A]/50 text-white focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          <span className={`block w-5 h-[2px] bg-current transform transition-transform duration-300 ${open ? 'rotate-45 translate-y-[8px]' : ''}`} />
          <span className={`block w-5 h-[2px] bg-current transition-opacity duration-300 ${open ? 'opacity-0' : 'opacity-100'}`} />
          <span className={`block w-5 h-[2px] bg-current transform transition-transform duration-300 ${open ? '-rotate-45 -translate-y-[8px]' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-64 border-t border-[#272A2A] mt-4 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ background: '#0B0B0B' }}
      >
        <div className="px-6 py-6 flex flex-col gap-6">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setOpen(false)}
                className={`font-body text-lg font-medium tracking-wide flex items-center justify-between ${
                  active ? 'text-white' : 'text-[#858585] hover:text-white'
                }`}
              >
                {label}
                {active && <span className="w-2 h-2 rounded-full bg-[#CC6437]" />}
              </Link>
            )
          })}
          <div className="h-[1px] w-full bg-[#272A2A]" />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm uppercase tracking-widest text-[#CC6437] hover:text-white transition-colors flex items-center gap-2"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </nav>
  )
}

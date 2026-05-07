import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import Navbar from './components/Navbar'

const Home = lazy(() => import('./pages/Home'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const PitchDeck = lazy(() => import('./pages/PitchDeck'))

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen grid-bg">
        <Navbar />
        <main className="pt-28">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/pitch" element={<PitchDeck />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </LazyMotion>
  )
}

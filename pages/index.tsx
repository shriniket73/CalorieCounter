import React from 'react'
import type { NextPage } from 'next'
import CalorieCalculator from '../components/CalorieCalculator'

const Home: NextPage = () => {
  return (
    <main>
      <CalorieCalculator />
    </main>
  )
}

export default Home
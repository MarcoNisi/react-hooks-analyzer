import React, { useState, useEffect, useMemo } from 'react'

const SampleComponent = () => {
  const [exampleBoolean, setExampleBoolean] = useState(false)
  const [exampleText, setExampleText] = useState('')

  useEffect(() => {
    setExampleBoolean(true)
  }, [])

  const memoized = useMemo(() => {
    return !exampleBoolean
  }, [exampleBoolean])

  useEffect(() => {
    console.log('Example boolean changed')
    const a = memoized || !!exampleBoolean
    const b = memoized && !!exampleBoolean
    console.log('New memozied:', memoized)
    console.log('Useless log', a, b)
  }, [exampleBoolean, memoized, exampleText])

  useEffect(() => {
    setExampleText('Test')
  }, [memoized])

  return (
    <div>
      <span>Hello, world</span>
      <span>{exampleText}</span>
    </div>
  )
}

export default SampleComponent

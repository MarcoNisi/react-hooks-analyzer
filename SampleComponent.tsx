import React, { useState, useEffect, useMemo } from 'react'

const SampleComponent = () => {
  const [exampleBoolean, setExampleBoolean] = useState(false)

  useEffect(() => {
    setExampleBoolean(true)
  }, [])

  const memoized = useMemo(() => {
    return !exampleBoolean
  }, [exampleBoolean])

  useEffect(() => {
    console.log('Example boolean changed')
    console.log('New memozied:', memoized)
  }, [exampleBoolean, memoized])
  return (
    <div>
      <span>Hello, world</span>
    </div>
  )
}

export default SampleComponent

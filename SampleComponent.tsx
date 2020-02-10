import React, { useState, useEffect } from 'react'

const SampleComponent = () => {
  const [exampleBoolean, setExampleBoolean] = useState(false)

  useEffect(() => {
    setExampleBoolean(true)
  }, [])

  useEffect(() => {
    console.log('Example boolean changed')
  }, [exampleBoolean])
  return (
    <div>
      <span>Hello, world</span>
    </div>
  )
}

export default SampleComponent

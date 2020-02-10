import Analyzer from './analyzer'

/*
  Limitations:
    - Hooks must starts with 'use'
    - Can't handle hooks that returns more than one value or an array with one element
*/

if (process.argv.length !== 4) {
  console.error('Invalid arguments')
  process.exit(1)
}

const sourcePath = process.argv[2]
const componentName = process.argv[3]

const analyzer = new Analyzer(sourcePath, componentName)
analyzer.collectStatesAndEffects()
console.log(analyzer.getStateElements())
console.log(analyzer.getEffectElements())

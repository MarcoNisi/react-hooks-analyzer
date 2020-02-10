import * as ts from 'typescript'

/*
  Limitations:
    - Hooks must starts with 'use'
    - Can't handle hooks that returns more than one value or an array with one element
*/

if (process.argv.length !== 4) {
  console.error('Invalid arguments')
  process.exit(1)
}

const filePath = process.argv[2]
const name = process.argv[3]

const program = ts.createProgram([filePath], { allowJs: true })
const sourceFile = program.getSourceFile(filePath)
sourceFile.statements.forEach(statement => {
  const typeStatement = statement as ts.VariableStatement
  if (typeStatement.kind === ts.SyntaxKind.VariableStatement) {
    typeStatement.declarationList.declarations.forEach(declaration => {
      const typedName = declaration.name as ts.Identifier
      if (typedName.escapedText === name) {
        const typedInitializer = declaration.initializer as ts.ArrowFunction
        const stateVars = {}
        const effects = []
        const manageEffect = (callExpression: ts.CallExpression) => {
          const typedIdentifier = callExpression.expression as ts.Identifier
          const expressionName = typedIdentifier.escapedText
          if (['useEffect', 'useLayoutEffect', 'useMemo', 'useCallback'].includes(expressionName as string)) {
            let deps = null
            if (callExpression.arguments.length > 1) {
              deps = (callExpression.arguments[1] as ts.ArrayLiteralExpression).elements
                .map(a => (a as ts.Identifier).escapedText)
                .filter(e => !!e)
            }
            const effectVar = {
              line: sourceFile.getLineAndCharacterOfPosition(typedIdentifier.pos).line + 1,
              deps,
              type: expressionName
            }
            effects.push(effectVar)
          }
        }
        ;(typedInitializer.body as ts.Block).statements.forEach(statement => {
          if (ts.isVariableStatement(statement)) {
            const declarations = statement.declarationList.declarations
            if (declarations.length) {
              const variableDeclaration = declarations[0] as ts.VariableDeclaration
              if (ts.isCallExpression(variableDeclaration.initializer)) {
                const typedIdentifier = variableDeclaration.initializer.expression as ts.Identifier
                const isHook = typedIdentifier.text.startsWith('use')
                if (isHook) {
                  let stateValueIdentifier = null
                  let stateValue = null
                  let stateSetter = null
                  if (ts.isArrayBindingPattern(variableDeclaration.name)) {
                    const elements = variableDeclaration.name.elements
                    stateValueIdentifier = (elements[0] as ts.BindingElement).name as ts.Identifier
                    stateValue = stateValueIdentifier.text
                    if (elements.length > 1) {
                      const stateSetterIdentifier = (elements[1] as ts.BindingElement).name as ts.Identifier
                      stateSetter = stateSetterIdentifier.text
                    }
                  } else if (ts.isIdentifier(variableDeclaration.name)) {
                    stateValueIdentifier = variableDeclaration.name as ts.Identifier
                    stateValue = stateValueIdentifier.text
                  }
                  const stateVar = {
                    line: sourceFile.getLineAndCharacterOfPosition(stateValueIdentifier.pos).line + 1,
                    value: stateValue,
                    setter: stateSetter
                  }
                  stateVars[stateValue] = stateVar

                  const isBaseHook = ['useMemo', 'useCallback'].includes(typedIdentifier.text)
                  if (isBaseHook) {
                    manageEffect(variableDeclaration.initializer)
                  }
                }
              }
            }
          }
          if (ts.isExpressionStatement(statement)) {
            manageEffect(statement.expression as ts.CallExpression)
          }
        })

        console.log(stateVars)
        console.log(effects)
      }
    })
  }
})

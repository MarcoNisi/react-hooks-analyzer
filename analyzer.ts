import ts from 'typescript'
import { IStateElement, IEffectElement, IEffect } from './interfaces'

class Analyzer {
  private sourcePath: string
  private componentName: string
  private sourceFile: ts.SourceFile
  private componentBody: ts.Block
  private stateElements: IStateElement[]
  private effectElements: IEffectElement[]
  constructor(sourcePath: string, componentName: string) {
    this.sourcePath = sourcePath
    this.componentName = componentName

    const program = ts.createProgram([this.sourcePath], { allowJs: true })
    const sourceFile = program.getSourceFile(this.sourcePath)
    if (sourceFile) {
      this.sourceFile = sourceFile
    } else {
      throw 'Invalid source path'
    }
    this.componentBody = this.getComponentBody()
    this.stateElements = []
    this.effectElements = []
  }
  getStateElements() {
    return this.stateElements
  }
  getEffectElements() {
    return this.effectElements
  }
  getComponentBody() {
    let componentDeclaration: undefined | ts.VariableDeclaration
    this.sourceFile.statements.forEach(statement => {
      if (statement.kind === ts.SyntaxKind.VariableStatement) {
        const typeStatement = statement as ts.VariableStatement
        componentDeclaration = typeStatement.declarationList.declarations.find(declaration => {
          const typedName = declaration.name as ts.Identifier
          return typedName.escapedText === this.componentName
        })
      }
    })
    if (!componentDeclaration) {
      throw "Can't find component inside the source path"
    } else {
      const typedInitializer = componentDeclaration.initializer as ts.ArrowFunction
      return typedInitializer.body as ts.Block
    }
  }
  collect() {
    this.componentBody.statements.forEach(statement => this.collectFromStatement(statement))
  }
  collectFromStatement(statement: ts.Statement) {
    if (ts.isVariableStatement(statement)) {
      const declarations = statement.declarationList.declarations
      if (declarations.length) {
        const variableDeclaration = declarations[0] as ts.VariableDeclaration
        if (variableDeclaration.initializer && ts.isCallExpression(variableDeclaration.initializer)) {
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
            } else return undefined
            this.stateElements.push({
              line: this.sourceFile.getLineAndCharacterOfPosition(stateValueIdentifier.pos).line + 1,
              value: stateValue,
              setter: stateSetter
            } as IStateElement)

            const isBaseHook = ['useMemo', 'useCallback'].includes(typedIdentifier.text)
            if (isBaseHook) {
              this.collectEffect(variableDeclaration.initializer)
            }
          }
        }
      }
    }
    if (ts.isExpressionStatement(statement)) {
      this.collectEffect(statement.expression as ts.CallExpression)
    }
  }
  collectEffect(callExpression: ts.CallExpression) {
    const typedIdentifier = callExpression.expression as ts.Identifier
    const expressionName = typedIdentifier.escapedText
    if (['useEffect', 'useLayoutEffect', 'useMemo', 'useCallback'].includes(expressionName as string)) {
      let deps: string[] = []
      if (callExpression.arguments.length > 1) {
        deps = (callExpression.arguments[1] as ts.ArrayLiteralExpression).elements
          .map(a => (a as ts.Identifier).escapedText as string)
          .filter(e => !!e)
      }
      this.effectElements.push({
        line: this.sourceFile.getLineAndCharacterOfPosition(typedIdentifier.pos).line + 1,
        deps,
        type: expressionName as IEffect
      } as IEffectElement)
    }
  }
}

export default Analyzer

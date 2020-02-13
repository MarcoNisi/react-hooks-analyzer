import ts from 'typescript'
import { IStateElement, IEffectElement, IEffect } from './interfaces'

class Analyzer {
  private sourcePath: string
  private componentName: string
  private sourceFile: ts.SourceFile
  private componentBody: ts.Block
  private stateElements: IStateElement[]
  private effectElements: IEffectElement[]
  public supportedEffects: string[]
  public effectsWithReturn: string[]
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
    this.supportedEffects = ['useEffect', 'useLayoutEffect', 'useMemo', 'useCallback']
    this.effectsWithReturn = ['useMemo', 'useCallback']
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
  collectStatesAndEffects() {
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

            const isBaseHook = this.effectsWithReturn.includes(typedIdentifier.text)
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
    if (this.supportedEffects.includes(expressionName as string)) {
      const effectElement: IEffectElement = {
        line: this.sourceFile.getLineAndCharacterOfPosition(typedIdentifier.pos).line + 1,
        uses: {
          setters: [],
          values: []
        },
        deps: [],
        body: ts.createNodeArray(),
        type: expressionName as IEffect
      }
      if (callExpression.arguments.length > 1) {
        const typedBody = (callExpression.arguments[0] as ts.ArrowFunction).body as ts.Block
        effectElement.body = typedBody.statements
        effectElement.deps = (callExpression.arguments[1] as ts.ArrayLiteralExpression).elements
          .map(a => (a as ts.Identifier).escapedText as string)
          .filter(e => !!e)
      }
      this.effectElements.push(effectElement)
    }
  }
  collectDeepUses() {
    this.effectElements.forEach(effect => {
      this.collectUses(effect.body, effect)
    })
  }
  collectUses(genericStatement: any, effect: IEffectElement) {
    Object.keys(genericStatement).forEach(key => {
      const identifier = genericStatement[key]
      if (key === 'escapedText') {
        if (this.stateElements.some(e => e.setter === identifier)) {
          effect.uses.setters.push(identifier)
        } else if (this.stateElements.some(e => e.value === identifier)) {
          effect.uses.values.push(identifier)
        }
      } else if (typeof identifier === 'object') this.collectUses.call(this, identifier, effect)
    })
  }
  connectDeps() {
    this.effectElements.forEach(effect => {
      this.stateElements
        .filter(state => effect.deps.includes(state.value))
        .forEach(state => {
          this.effectElements.forEach(otherEffect => {
            if (otherEffect.uses.setters.includes(state.setter)) {
              console.log(`${effect.type} at line ${effect.line} depend on ${otherEffect.type} at line ${otherEffect.line}`)
            }
          })
        })
    })
  }
  analyze() {
    this.collectStatesAndEffects()
    this.collectDeepUses()
    this.connectDeps()
  }
}

export default Analyzer

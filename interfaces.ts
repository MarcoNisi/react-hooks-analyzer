import ts from 'typescript'

export type IEffect = 'useEffect' | 'useMemo' | 'useLayoutEffect' | 'useCallback'
export interface IStateElement {
  line: number
  value: string
  setter: string
}
export interface IUses {
  setters: string[]
  values: string[]
}
export interface IEffectElement {
  line: number
  type: IEffect
  body: ts.NodeArray<ts.Statement>
  deps: string[]
  uses: IUses
}

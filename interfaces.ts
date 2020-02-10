export type IEffect = 'useEffect' | 'useMemo' | 'useLayoutEffect' | 'useCallback'
export interface IStateElement {
  line: number
  value: string
  setter: string
}
export interface IEffectElement {
  line: number
  type: IEffect
  deps: string[]
}

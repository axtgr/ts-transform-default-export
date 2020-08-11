import Path from 'path'
import ts from 'typescript'
import transformerFactory, { TransformerOptions } from '../src'

const COMPILER_OPTIONS: ts.CompilerOptions = {
  noImplicitUseStrict: true,
  declaration: true,
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ESNext,
  newLine: ts.NewLineKind.LineFeed,
}
const FILE_NAME = 'test.ts'

function transform(sourceText: string, options?: TransformerOptions) {
  let host = ts.createCompilerHost(COMPILER_OPTIONS)
  let result = {
    module: '',
    declaration: '',
  }

  let getSourceFile = host.getSourceFile
  host.getSourceFile = (file, ...args) => {
    if (file === FILE_NAME) {
      return ts.createSourceFile(file, sourceText, COMPILER_OPTIONS.target, true)
    }
    return getSourceFile(file, ...args)
  }

  host.writeFile = (fileName: string, data: string) => {
    let fileType: keyof typeof result =
      Path.extname(fileName) === '.js' ? 'module' : 'declaration'
    result[fileType] = String(data).trim()
  }

  let program = ts.createProgram([FILE_NAME], COMPILER_OPTIONS, host)
  let transformer = transformerFactory(program, options)
  let customTransformers = {
    before: [transformer],
    afterDeclarations: [transformer],
  }

  program.emit(undefined, undefined, undefined, false, customTransformers)
  return result
}

export { transform }

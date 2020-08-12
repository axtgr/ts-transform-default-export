import Path from 'path'
import ts from 'typescript'

function removeDefaultExportModifiers(modifiers: ts.ModifiersArray | ts.Modifier[]) {
  return modifiers.filter(
    (modifier) =>
      modifier.kind !== ts.SyntaxKind.ExportKeyword &&
      modifier.kind !== ts.SyntaxKind.DefaultKeyword
  )
}

function hasDefaultExportModifiers(node: ts.Node) {
  return (
    node.modifiers &&
    node.modifiers.find((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
    node.modifiers.find((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
  )
}

function convertDeclaration(
  node: ts.FunctionDeclaration | ts.ClassDeclaration,
  addDeclare = false
) {
  let modifiers = node.modifiers ? removeDefaultExportModifiers(node.modifiers) : []

  if (addDeclare) {
    modifiers.unshift(ts.createModifier(ts.SyntaxKind.DeclareKeyword))
  }

  return {
    ...node,
    name: node.name || ts.getGeneratedNameForNode(node),
    modifiers: (modifiers as unknown) as ts.ModifiersArray,
  }
}

function createExportAssignmentForNode(node: ts.Node, isExportEquals = false) {
  let name = ts.isIdentifier(node)
    ? node
    : (node as any).propertyName ||
      (node as any).name ||
      ts.getGeneratedNameForNode(node)
  return ts.createExportAssignment(undefined, undefined, isExportEquals, name)
}

function visitor(
  isDeclarationFile: boolean,
  keepOriginalExport: boolean,
  context: ts.TransformationContext,
  node: ts.Node
): ts.Node | ts.Node[] | undefined {
  if (ts.isExportDeclaration(node)) {
    // `export { foo as default, bar, baz as qux }` → `export = foo`

    let hasOtherSpecifiers = false
    let defaultSpecifier: ts.ExportSpecifier | undefined

    node = ts.visitEachChild(
      node,
      (node) => {
        return ts.visitEachChild(
          node,
          (node) => {
            if (
              ts.isExportSpecifier(node) &&
              node.name.escapedText === 'default' &&
              node.propertyName
            ) {
              defaultSpecifier = node
              return keepOriginalExport ? node : undefined
            }

            hasOtherSpecifiers = true
            return node
          },
          context
        )
      },
      context
    )

    if (!defaultSpecifier) {
      return node
    }

    let exportAssignment = createExportAssignmentForNode(defaultSpecifier, true)

    if (keepOriginalExport || hasOtherSpecifiers) {
      return [node, exportAssignment]
    }

    return exportAssignment
  }

  if (
    hasDefaultExportModifiers(node) &&
    (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))
  ) {
    // `export default function foo() {}` → `declare function foo(): void; export = foo`
    // `export default class Bar {}` → `declare class Bar {}; export = Bar`

    let nodes = [
      convertDeclaration(node, isDeclarationFile),
      createExportAssignmentForNode(node, true),
    ]

    if (keepOriginalExport) {
      nodes.push(createExportAssignmentForNode(node))
    }

    return nodes
  }

  if (ts.isExportAssignment(node)) {
    // `export default fn` → `export = fn`

    let equalsAssignment = createExportAssignmentForNode(node.expression, true)

    if (keepOriginalExport) {
      return [node, equalsAssignment]
    }

    return equalsAssignment
  }

  return node
}

interface TransformerOptions {
  /**
   * Whether to keep the original default export in the code when transforming it
   *
   * ```
   * // When false:
   * export { foo as default }
   * //=> export = foo
   * ```
   *
   * ```
   * // When true:
   * export { foo as default, bar }
   * //=> export { foo as default }; export = foo
   * ```
   */
  keepOriginalExport?: boolean

  /**
   * Whether to throw when there are named exports in the module along with the default one
   *
   * ```
   * // When false:
   * export { foo as default, bar }
   * //=> Error
   * ```
   *
   * ```
   * // When true:
   * export { foo as default, bar }
   * //=> export { bar }; export = foo
   * ```
   */
  allowNamedExports?: boolean
}

/**
 * Transforms default exports to `export =` so that they become `module.exports =`
 * when transpiled to CommonJS or UMD
 *
 * ```
 * export { foo as default }
 * //=> export = foo
 * ```
 *
 * ```
 * export default foo
 * //=> export = foo
 * ```
 *
 * ```
 * export default function foo() {}
 * //=> function foo() {}; export = foo
 * ```
 */
function transformDefaultExport(
  program: ts.Program,
  options: TransformerOptions = {}
): ts.TransformerFactory<ts.SourceFile> {
  let typeChecker = program.getTypeChecker()
  let rootFiles = program.getRootFileNames()

  return (context) => {
    return (file) => {
      if (
        rootFiles.indexOf(file.fileName) === -1 &&
        rootFiles.indexOf(Path.normalize(file.fileName)) === -1
      ) {
        return file
      }

      let moduleSymbol = typeChecker.getSymbolAtLocation(file)

      if (!moduleSymbol) {
        return file
      }

      let hasDefaultExport = false
      let hasNamedExports = false

      typeChecker.getExportsOfModule(moduleSymbol).forEach((exp) => {
        if (exp.escapedName === 'default') {
          hasDefaultExport = true
        } else {
          hasNamedExports = true
        }
      })

      if (!hasDefaultExport) {
        return file
      }

      if (!options.allowNamedExports && hasNamedExports) {
        throw new Error(
          `Unable to transform the default export of the module "${file.fileName}".` +
            ' The module has named exports, which could be lost during the transformation.' +
            ' To ignore this, set the `allowNamedExports` option to `true`'
        )
      }

      return ts.visitEachChild(
        file,
        visitor.bind(
          null,
          file.isDeclarationFile,
          Boolean(options.keepOriginalExport),
          context
        ),
        context
      )
    }
  }
}

export { transformDefaultExport as default, TransformerOptions }

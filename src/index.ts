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
  keepOriginalExports: boolean,
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
              return keepOriginalExports ? node : undefined
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

    if (keepOriginalExports || hasOtherSpecifiers) {
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

    if (keepOriginalExports) {
      nodes.push(createExportAssignmentForNode(node))
    }

    return nodes
  }

  if (ts.isExportAssignment(node)) {
    // `export default fn` → `export = fn`

    let equalsAssignment = createExportAssignmentForNode(node.expression, true)

    if (keepOriginalExports) {
      return [node, equalsAssignment]
    }

    return equalsAssignment
  }

  return node
}

interface TransformerOptions {
  keepOriginalExports?: boolean
}

function transformDefaultExport(
  program: ts.Program,
  options: TransformerOptions = {}
): ts.TransformerFactory<ts.SourceFile> {
  let rootFiles = program.getRootFileNames()
  return (context) => {
    return (file) => {
      if (rootFiles.indexOf(Path.normalize(file.fileName)) === -1) {
        return file
      }

      return ts.visitEachChild(
        file,
        visitor.bind(
          null,
          file.isDeclarationFile,
          Boolean(options.keepOriginalExports),
          context
        ),
        context
      )
    }
  }
}

export { transformDefaultExport as default, TransformerOptions }

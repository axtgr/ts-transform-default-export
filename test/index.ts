import t from 'tap'
import { transform } from './_compiler'

const KEEP_EXPORTS = {
  keepOriginalExport: true,
}

t.test('Transforms function declarations', (t) => {
  let { module, declaration } = transform('export default function foo() {}')

  t.equal(module, 'function foo() { }\nmodule.exports = foo;')
  t.equal(declaration, 'declare function foo(): void;\nexport = foo;')

  t.test('Keeps the original exports when keepOriginalExports === true', (t) => {
    let { module, declaration } = transform(
      'export default function foo() {}',
      KEEP_EXPORTS
    )

    t.equal(module, 'function foo() { }\nexports.default = foo;\nmodule.exports = foo;')
    t.equal(
      declaration,
      'declare function foo(): void;\nexport = foo;\nexport default foo;'
    )

    t.done()
  })

  t.done()
})

t.test('Transforms class declarations', (t) => {
  let { module, declaration } = transform('export default class Foo {}')

  t.equal(module, 'class Foo {\n}\nmodule.exports = Foo;')
  t.equal(declaration, 'declare class Foo {\n}\nexport = Foo;')

  t.test('Keeps the original exports when keepOriginalExports === true', (t) => {
    let { module, declaration } = transform('export default class Foo {}', KEEP_EXPORTS)

    t.equal(module, 'class Foo {\n}\nexports.default = Foo;\nmodule.exports = Foo;')
    t.equal(declaration, 'declare class Foo {\n}\nexport = Foo;\nexport default Foo;')

    t.done()
  })

  t.done()
})

t.test('Transforms export assignments', (t) => {
  let { module, declaration } = transform('export default foo')

  t.equal(module, 'module.exports = foo;')
  t.equal(declaration, 'export = foo;')

  t.test('Keeps the original exports when keepOriginalExports === true', (t) => {
    let { module, declaration } = transform('export default foo', KEEP_EXPORTS)

    t.equal(module, 'exports.default = foo;\nmodule.exports = foo;')
    t.equal(declaration, 'export default foo;\nexport = foo;')

    t.done()
  })

  t.done()
})

t.test('Transforms export declarations', (t) => {
  let { module, declaration } = transform('export { foo as default }')

  t.equal(module, 'module.exports = foo;')
  t.equal(declaration, 'export = foo;')

  t.test('Keeps the original exports when keepOriginalExports === true', (t) => {
    let { module, declaration } = transform('export { foo as default }', KEEP_EXPORTS)

    t.equal(module, 'exports.default = void 0;\nmodule.exports = foo;')
    t.equal(declaration, 'export { foo as default };\nexport = foo;')

    t.done()
  })

  t.done()
})

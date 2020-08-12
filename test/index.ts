import t from 'tap'
import { transform } from './_compiler'

const KEEP_EXPORT = {
  keepOriginalExport: true,
}
const ALLOW_NAMED_EXPORTS = {
  allowNamedExports: true,
}

t.test('Transforms function declarations', (t) => {
  let { module, declaration } = transform('export default function foo() {}')

  t.equal(module, 'function foo() { }\nmodule.exports = foo;')
  t.equal(declaration, 'declare function foo(): void;\nexport = foo;')

  t.test('Keeps the original export when keepOriginalExport === true', (t) => {
    let { module, declaration } = transform(
      'export default function foo() {}',
      KEEP_EXPORT
    )

    t.equal(module, 'function foo() { }\nexports.default = foo;\nmodule.exports = foo;')
    t.equal(
      declaration,
      'declare function foo(): void;\nexport = foo;\nexport default foo;'
    )

    t.done()
  })

  t.test(
    'Throws an error when there are named exports and allowNamedExports === false',
    (t) => {
      t.throws(() => {
        transform('export default function foo() {}; export const bar = 123')
      })
      t.done()
    }
  )

  t.test('Keeps the named exports intact when allowNamedExports === true', (t) => {
    let { module, declaration } = transform(
      'export default function foo() {}; export const bar = 123',
      ALLOW_NAMED_EXPORTS
    )

    t.equal(
      module,
      'exports.bar = void 0;\nfunction foo() { }\n;\nexports.bar = 123;\nmodule.exports = foo;'
    )
    t.equal(
      declaration,
      'declare function foo(): void;\nexport = foo;\nexport declare const bar = 123;'
    )

    t.done()
  })

  t.done()
})

t.test('Transforms class declarations', (t) => {
  let { module, declaration } = transform('export default class Foo {}')

  t.equal(module, 'class Foo {\n}\nmodule.exports = Foo;')
  t.equal(declaration, 'declare class Foo {\n}\nexport = Foo;')

  t.test('Keeps the original export when keepOriginalExport === true', (t) => {
    let { module, declaration } = transform('export default class Foo {}', KEEP_EXPORT)

    t.equal(module, 'class Foo {\n}\nexports.default = Foo;\nmodule.exports = Foo;')
    t.equal(declaration, 'declare class Foo {\n}\nexport = Foo;\nexport default Foo;')

    t.done()
  })

  t.test(
    'Throws an error when there are named exports and allowNamedExports === false',
    (t) => {
      t.throws(() => {
        transform('export default class Foo {}; export const bar = 123')
      })
      t.done()
    }
  )

  t.test('Keeps the named exports intact when allowNamedExports === true', (t) => {
    let { module, declaration } = transform(
      'export default class Foo {}; export const bar = 123',
      ALLOW_NAMED_EXPORTS
    )

    t.equal(
      module,
      'exports.bar = void 0;\nclass Foo {\n}\n;\nexports.bar = 123;\nmodule.exports = Foo;'
    )
    t.equal(
      declaration,
      'declare class Foo {\n}\nexport = Foo;\nexport declare const bar = 123;'
    )

    t.done()
  })

  t.done()
})

t.test('Transforms export assignments', (t) => {
  let { module, declaration } = transform('export default foo')

  t.equal(module, 'module.exports = foo;')
  t.equal(declaration, 'export = foo;')

  t.test('Keeps the original export when keepOriginalExport === true', (t) => {
    let { module, declaration } = transform('export default foo', KEEP_EXPORT)

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

  t.test('Keeps the original export when keepOriginalExport === true', (t) => {
    let { module, declaration } = transform('export { foo as default }', KEEP_EXPORT)

    t.equal(module, 'exports.default = void 0;\nmodule.exports = foo;')
    t.equal(declaration, 'export { foo as default };\nexport = foo;')

    t.done()
  })

  t.test(
    'Throws an error when there are named exports and allowNamedExports === false',
    (t) => {
      t.throws(() => {
        transform('export { foo as default, bar }')
      })
      t.done()
    }
  )

  t.test('Keeps the named exports intact when allowNamedExports === true', (t) => {
    let { module, declaration } = transform(
      'export { foo as default, bar }',
      ALLOW_NAMED_EXPORTS
    )

    t.equal(module, 'exports.bar = void 0;\nmodule.exports = foo;')
    t.equal(declaration, 'export { bar };\nexport = foo;')

    t.done()
  })

  t.done()
})

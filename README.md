# ts-transform-default-export

[![Buy me a beer](https://img.shields.io/badge/%F0%9F%8D%BA-Buy%20me%20a%20beer-red?style=flat)](https://www.buymeacoffee.com/axtgr)
[![CI](https://img.shields.io/github/workflow/status/axtgr/ts-transform-default-export/CI?label=CI&logo=github)](https://github.com/axtgr/ts-transform-default-export/actions)

A TypeScript transformer that converts a default export such as one of these:

```ts
export default function foo() {}
export default foo
export { foo as default }
```

to its CommonJS counterpart:

```ts
export = foo
```

When such a module is then transpiled to CommonJS or UMD, the export will become `module.exports = foo`,
making the module consumable by `require('foo')` instead of `require('foo').default`.

Only files that match the `files` or `include` property of your `tsconfig.json` will be transformed.
This is an intentional restriction to make it possible to control which files are processed.

## Installation

`npm install --save-dev ts-transform-default-export`

Currently there is no native way to add a custom transformer to your TypeScript compilation pipeline.
Instead, you have to use a third-party tool ([TTypescript](https://github.com/cevek/ttypescript),
[ts-patch](https://github.com/nonara/ts-patch)) or a plugin for your bundler. For concrete instructions
refer to the docs of the tool of your choice.

The type of this transformer is `program`, the most common one. To transform the module file, add it
to the `before` stage. To transform the emitted declaration file, add it to `afterDeclarations`.

### Example `tsconfig.json` for TTypescript

```js
{
  "compilerOptions": {
    "module": "CommonJS",
    "plugins": [{
      "transform": "ts-transform-default-export",
      "afterDeclarations": true,
      "keepOriginalExport": true // Transformer option
    }]
  },
  "include": ["src/index.ts"]
}
```

## Options

### `keepOriginalExport`: boolean

Whether to keep the original default export in the code when transforming it.

- When `false` (default):

  `export default foo` → `export = foo`

- When `true`:

  `export default foo` → `export default foo; export = foo`

### `allowNamedExports`: boolean

Whether to throw when there are named exports in the module along with the default one.
This is important because when a default export is converted to `export =`, named exports
could get lost. For example, `export { foo as default, bar }` becomes `exports.bar = bar; module.exports = foo`,
so `bar` is overwritten.

You can work around this by assigning the named exports to the default export's value
if possible (`foo.bar = bar; export { foo as default, bar }`) and setting this option to true.

- When `false` (default):

  `export { foo as default, bar }` → throws an error

- When `true` (and `keepOriginalExport` is `false`):

  `export { foo as default, bar }` → `export { bar }; export = foo`

- When `true` (and `keepOriginalExport` is `true`):

  `export { foo as default, bar }` → `export { foo as default, bar }; export = foo`

## License

[ISC](LICENSE)

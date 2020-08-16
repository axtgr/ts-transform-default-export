# ts-transform-default-export

[![npm package](https://img.shields.io/npm/v/ts-transform-default-export)](https://www.npmjs.com/package/ts-transform-default-export)
[![CI](https://img.shields.io/github/workflow/status/axtgr/ts-transform-default-export/CI?label=CI&logo=github)](https://github.com/axtgr/ts-transform-default-export/actions)
[![Buy me a beer](https://img.shields.io/badge/%F0%9F%8D%BA-Buy%20me%20a%20beer-red?style=flat)](https://www.buymeacoffee.com/axtgr)

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

This is especially useful when making a package compatible with both CommonJS and ES modules.

## Installation

`npm install --save-dev ts-transform-default-export`

## Usage

After the package is installed, you need to add it to your TypeScript compilation pipeline.
Currently there is [no native way to do it](https://github.com/Microsoft/TypeScript/issues/14419),
so you'll have to use a third-party tool ([TTypescript](https://github.com/cevek/ttypescript),
[ts-patch](https://github.com/nonara/ts-patch)) or a plugin for your bundler (e.g.
[rollup-plugin-ts](https://github.com/wessberg/rollup-plugin-ts)). For concrete instructions
refer to the docs of the tool of your choice. When adding the transformer, keep in mind
that its type is `program`, the most common one.

The transformer can be added to the `before` or `afterDeclarations` stages of compilation.

- When added to the `before` stage, it will transform only modules themselves. In this
  case the resulting code will not match its type declarations.

- When added to `afterDeclarations`, it will transform only declaration files. This will
  also produce mismatching type declarations. However, this can be useful if your build
  tool transforms the modules for you (e.g. `rollup` with `output.exports = 'default'`)
  and you want to make the declarations compatible.

- When added to both `before` and `afterDeclarations`, both modules and declarations
  will be transformed. This is the most common case that produces matching files.

Only files that match the `files` or `include` property of your `tsconfig.json` will be
transformed. This is an intentional restriction to make it possible to control which files
are processed.

### Example `tsconfig.json` for TTypescript

```js
{
  "compilerOptions": {
    "module": "CommonJS",
    "plugins": [{
      "transform": "ts-transform-default-export",
      "afterDeclarations": true,
      "keepOriginalExport": true // Option of the transformer
    }]
  },
  "include": ["src/index.ts"]
}
```

### Example `rollup.config.js` with `rollup-plugin-ts`

This configuration is interesting in that it produces two bundled modules (`index.js`
for CommonJS and `index.mjs` for ESM), two source maps and a _single_ declaration file
(`index.d.ts`) that is compatible with _both_ the modules.

```js
import typescript from 'rollup-plugin-ts'
import transformDefaultExport from 'ts-transform-default-export'

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'cjs',
      sourcemap: true,
      exports: 'default',
    },
    {
      dir: 'dist',
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].mjs',
    },
  ],
  plugins: [
    typescript({
      transformers: ({ program }) => ({
        afterDeclarations: transformDefaultExport(program, {
          keepOriginalExport: true,
        }),
      }),
    }),
  ],
}
```

## Options

### `keepOriginalExport`: boolean

Whether to keep the original default export in the code when transforming it. Useful
if you want to get a declaration file that is compatible with both CommonJS and ES modules.

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

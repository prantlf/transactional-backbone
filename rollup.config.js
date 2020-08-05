import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import cleanup from 'rollup-plugin-cleanup'
import { terser } from 'rollup-plugin-terser'

const globals = { underscore: '_', backbone: 'Backbone' }
const name = 'TransactionalBackbone'
const sourcemap = true

export default {
  input: 'index.js',
  output: [
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap
    },
    {
      file: 'dist/index.min.mjs',
      format: 'esm',
      sourcemap,
      plugins: [terser()]
    },
    {
      file: 'dist/index.js',
      format: 'umd',
      exports: 'named',
      sourcemap,
      name,
      globals
    },
    {
      file: 'dist/index.min.js',
      format: 'umd',
      exports: 'named',
      sourcemap,
      name,
      globals,
      plugins: [terser()]
    }
  ],
  external: ['underscore', 'jquery', 'backbone'],
  plugins: [cleanup(), resolve({ jsnext: true }), commonjs()]
}

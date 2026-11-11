/**
 * The browser half of the Workbench bundle.
 *
 * The loader calls `factory(require)` with a CommonJS-style `require`. Everything else
 * lives under `client/` as plain ESM; this file only adapts the loader to it.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-workbench',
  factory(require) {
    const React = require('react')
    let pending = undefined
    let failure = undefined
    // The module graph is ESM, so the registration is wired on first use.
    const ready = import('./client/main.js').then(
      (module) => module,
      (error) => {
        failure = error
        throw error
      },
    )

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        if (failure !== undefined) throw failure
        pending = ready.then((module) => module.applyWith(ctx, React))
        return pending
      },
    }
  },
})

import chai from 'chai'
import fg from 'fast-glob'
import SinonChai from 'sinon-chai'
import { clearContext, defaultSuite } from './suite'
import { context } from './context'
import { File, Config, Task, Reporter, RunnerContext } from './types'
import { afterEachHook, afterFileHook, afterAllHook, afterSuiteHook, beforeEachHook, beforeFileHook, beforeAllHook, beforeSuiteHook } from './hooks'
import { SnapshotPlugin } from './snapshot'
import { DefaultReporter } from './reporters/default'
import { defaultIncludes, defaultExcludes } from './constants'

export async function runTask(task: Task, ctx: RunnerContext) {
  const { reporter } = ctx

  task.status = 'run'
  await reporter.onTaskBegin?.(task, ctx)
  await beforeEachHook.fire(task)

  if (task.suite.mode === 'skip' || task.mode === 'skip'
    || (ctx.mode === 'only' && (task.suite.mode !== 'only' || task.mode !== 'only'))) {
    task.status = 'skip'
  }
  else if (task.suite.mode === 'todo' || task.mode === 'todo') {
    task.status = 'todo'
  }
  else {
    try {
      await task.fn()
      task.status = 'pass'
    }
    catch (e) {
      task.status = 'fail'
      task.error = e
    }
  }

  await afterEachHook.fire(task)
  await reporter.onTaskEnd?.(task, ctx)
}

export async function collectFiles(files: string[]) {
  const result: File[] = []

  for (const filepath of files) {
    const file: File = {
      filepath,
      suites: [],
      collected: false,
    }

    clearContext()
    try {
      await import(filepath)

      const collectors = [defaultSuite, ...context.suites]
      for (const c of collectors) {
        context.currentSuite = c
        file.suites.push(await c.collect(file))
      }

      file.collected = true
    }
    catch (e) {
      file.error = e
      file.collected = false
      process.exitCode = 1
    }

    result.push(file)
  }

  return result
}

export async function runFile(file: File, ctx: RunnerContext) {
  const { reporter } = ctx

  await reporter.onFileBegin?.(file, ctx)
  await beforeFileHook.fire(file)
  for (const suite of file.suites) {
    await reporter.onSuiteBegin?.(suite, ctx)
    await beforeSuiteHook.fire(suite)

    for (const t of suite.tasks)
      await runTask(t, ctx)

    await afterSuiteHook.fire(suite)
    await reporter.onSuiteEnd?.(suite, ctx)
  }
  await afterFileHook.fire(file)
  await reporter.onFileEnd?.(file, ctx)
}

export async function run(config: Config) {
  const { rootDir = process.cwd() } = config

  // setup chai
  chai.use(await SnapshotPlugin({
    rootDir,
    update: config.updateSnapshot,
  }))
  chai.use(SinonChai)

  // collect files
  let paths = await fg(
    config.includes || defaultIncludes,
    {
      absolute: true,
      cwd: config.rootDir,
      ignore: config.excludes || defaultExcludes,
    },
  )

  if (config.nameFilters?.length)
    paths = paths.filter(i => config.nameFilters!.some(f => i.includes(f)))

  if (!paths.length) {
    console.error('No test files found')
    process.exitCode = 1
    return
  }

  const reporter: Reporter = new DefaultReporter()

  await reporter.onStart?.(config)

  const files = await collectFiles(paths)

  const ctx: RunnerContext = {
    files,
    mode: isOnlyMode(files) ? 'only' : 'all',
    config,
    reporter,
  }

  await reporter.onCollected?.(ctx)
  await beforeAllHook.fire()

  for (const file of files)
    await runFile(file, ctx)

  await afterAllHook.fire()
  await reporter.onFinished?.(ctx)
}

function isOnlyMode(files: File[]) {
  return files.some(file => file.suites.some(suite => suite.mode === 'only'))
}

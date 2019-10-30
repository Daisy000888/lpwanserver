// Model is a proxy that presents a model's API
// The proxy is configured with things like db
// Which is passes to the methods called
// This gets us dependency injection and more easily tested model functions
const R = require('ramda')
const { renameKeys, traceError } = require('../lib/utils')
const httpErrors = require('http-errors')

// *********************************************************************
// Model Library
// *********************************************************************
const wrapCommand = (context, api, role, cmd) => (args, ctx) => {
  ctx = R.merge(context, ctx)
  const result = api[cmd](ctx, args)
  if (result && typeof result === 'object' && typeof result.catch === 'function') {
    return result.catch(err => {
      if (ctx.traceError !== false) traceError(`${role}:${cmd}`, args, err)
      throw err
    })
  }
  return result
}

const buildApi = (context, role, api, seed = {}) => R.reduce(
  (acc, cmd) => R.assoc(cmd, wrapCommand(context, api, role, cmd), acc),
  seed,
  R.keys(api)
)

const createModel = ({ context = {}, role, publicApi, privateApi, init }) => {
  context = { ...context }
  let $publicApi = buildApi(context, role, publicApi)
  context.$self = privateApi ? buildApi(context, role, privateApi, $publicApi) : $publicApi
  if (init) init(context)
  return $publicApi
}

// *********************************************************************
// Common Model CRUD Implementations
// *********************************************************************
function create (ctx, args) {
  return ctx.db.create(args)
}

const renameQueryKeys = renameKeys({ search: 'name_contains' })

function list (ctx, { where = {}, ...opts } = {}) {
  return ctx.db.list({ where: renameQueryKeys(where), ...opts })
}

function load (ctx, args) {
  return ctx.db.load(args)
}

async function loadByQuery (ctx, args) {
  let [recs] = await ctx.db.list({ ...args, limit: 1 })
  if (!recs.length) throw new httpErrors.NotFound()
  return recs[0]
}

function update (ctx, args) {
  return ctx.db.update(args)
}

function remove (ctx, { id }) {
  return ctx.db.remove(id)
}

async function updateByQuery (ctx, { where, data, ...opts }) {
  const [recs] = await ctx.db.list({ where })
  if (!recs.length) throw new httpErrors.NotFound()
  return ctx.db.update({
    where: { id: recs[0].id },
    data,
    ...opts
  })
}

// Async generator for removing many records
async function * removeMany (ctx, { where, limit = 100 }) {
  let offset = 0
  let remaining = Infinity
  while (remaining > 0) {
    let [records, count] = await ctx.$self.list({ where, offset, limit, includeTotal: true })
    await Promise.all(records.map(x => ctx.$self.remove({ id: x.id })))
    offset = offset + limit
    remaining = count - limit
    yield {
      removed: records.map(R.prop('id')),
      remaining
    }
  }
}

// Async generator for listing all records in a collection
async function * listAll (ctx, { where, limit = 100, ...opts }) {
  let offset = 0
  let total = Infinity
  while (offset < total) {
    let [records, totalCount] = await ctx.$self.list({ ...opts, where, limit, includeTotal: true })
    yield { records, totalCount, offset }
    offset = offset + limit
    total = totalCount
  }
}

module.exports = {
  createModel,
  create,
  list,
  listAll,
  load,
  loadByQuery,
  update,
  updateByQuery,
  remove,
  removeMany
}

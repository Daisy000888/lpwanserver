var { logger } = require('../log')
var restServer
var modelAPI
const { formatRelationshipsOut } = require('../lib/prisma')

exports.initialize = function (app, server) {
  restServer = server
  modelAPI = server.modelAPI

  /*********************************************************************
     * NetworkProtocols API.
     ********************************************************************/
  /**
     * Gets the networkProtocols available
     *
     * @api {get} /api/networkProtocols Get Network Protocols
     * @apiGroup Network Protocols
     * @apiDescription Returns an array of the Network Protocols that
     *      match the options.
     * @apiPermission All logged-in users.
     * @apiHeader {String} Authorization The Create Session's returned token
     *      prepended with "Bearer "
     * @apiParam (Query Parameters) {Number} [limit] The maximum number of
     *      records to return.  Use with offset to manage paging.  0 is the
     *      same as unspecified, returning all users that match other query
     *      parameters.
     * @apiParam (Query Parameters) {Number} [offset] The offset into the
     *      returned database query set.  Use with limit to manage paging.  0 is
     *      the same as unspecified, returning the list from the beginning.
     * @apiParam (Query Parameters) {String} [search] Search the Network
     *      Protocols based on name matches to the passed string.  In the
     *      string, use "%" to match 0 or more characters and "_" to match
     *      exactly one.  For example, to match names starting with "D", use
     *      the string "D%".
     * @apiSuccess {Object} object
     * @apiSuccess {Number} object.totalCount The total number of records that
     *      would have been returned if offset and limit were not specified.
     *      This allows for calculation of number of "pages" of data.
     * @apiSuccess {Object[]} object.records An array of Network Protocols
     *      records.
     * @apiSuccess {String} object.records.id The Network Protocol's Id
     * @apiSuccess {String} object.records.name The name of the Network Protocol
     * @apiSuccess {String} object.records.protocolHandler The Network Protocol
     *      node code that communicates with a remote Network.
     * @apiSuccess {String} object.records.networkTypeId The id of the Network
     *      Type that the Network Protocol uses for data input.
     * @apiVersion 1.2.1
     */

  app.get('/api/networkProtocols', [restServer.isLoggedIn],
    function (req, res) {
      var options = {}
      if (req.query.limit) {
        var limitInt = parseInt(req.query.limit, 10)
        if (!isNaN(limitInt)) {
          options.limit = limitInt
        }
      }
      if (req.query.offset) {
        var offsetInt = parseInt(req.query.offset, 10)
        if (!isNaN(offsetInt)) {
          options.offset = offsetInt
        }
      }
      if (req.query.search) {
        options.search = req.query.search
      }
      if (req.query.networkTypeId) {
        options.networkTypeId = req.query.networkTypeId
      }
      if (req.query.networkProtocolVersion) {
        options.networkProtocolVersion = req.query.networkProtocolVersion
      }
      modelAPI.networkProtocols.list(options, { includeTotal: true }).then(([ records, totalCount ]) => {
        // restServer.respondJson(res, null, nps)
        const responseBody = { totalCount, records: records.map(formatRelationshipsOut) }
        restServer.respond(res, 200, responseBody)
      })
        .catch(function (err) {
          logger.error('Error getting networkProtocols: ', err)
          restServer.respond(res, err)
        })
    })

  app.get('/api/networkProtocols/group', [restServer.isLoggedIn],
    function (req, res) {
      var options = {}
      if (req.query.limit) {
        var limitInt = parseInt(req.query.limit, 10)
        if (!isNaN(limitInt)) {
          options.limit = limitInt
        }
      }
      if (req.query.offset) {
        var offsetInt = parseInt(req.query.offset, 10)
        if (!isNaN(offsetInt)) {
          options.offset = offsetInt
        }
      }
      if (req.query.search) {
        options.search = req.query.search
      }
      if (req.query.networkTypeId) {
        options.networkTypeId = req.query.networkTypeId
      }
      modelAPI.networkProtocols.list(options, { includeTotal: true }).then(([ recs, totalCount ]) => {
        let nps = { totalCount, records: [] }
        let len = recs.length
        for (let i = 0; i < len; i++) {
          let rec = recs[i]
          let found = false
          let counter = 0
          while (!found && counter < nps.records.length) {
            if (nps.records[counter].name === rec.name) {
              found = true
              nps.records[counter].versions.push(formatRelationshipsOut(rec))
            }
            else {
              counter++
            }
          }
          // Not found
          if (!found) {
            nps.records.push({
              name: rec.name,
              masterProtocolId: rec.masterProtocol.id,
              networkTypeId: rec.networkType.id,
              versions: [rec]
            })
          }
        }
        console.log(JSON.stringify(nps))
        restServer.respond(res, 200, nps)
      })
        .catch(function (err) {
          logger.error('Error getting networkProtocols: ', err)
          restServer.respond(res, err)
        })
    })

  /**
     * @apiDescription Gets the Network Protocol record with the specified id.
     *
     * @api {get} /api/networkProtocols/:id Get Network Protocol
     * @apiGroup Network Protocols
     * @apiPermission Any logged-in user.
     * @apiHeader {String} Authorization The Create Session's returned token
     *      prepended with "Bearer "
     * @apiParam (URL Parameters) {String} id The Network Protocol's id
     * @apiSuccess {Object} object
     * @apiSuccess {String} object.id The Network Protocol's Id
     * @apiSuccess {String} object.name The name of the Network Protocol
     * @apiSuccess {String} object.protocolHandler The Network Protocol
     *      node code that communicates with a remote Network.
     * @apiSuccess {String} object.networkTypeId The id of the Network
     *      Type that the Network Protocol uses for data input.
     * @apiVersion 1.2.1
     */
  app.get('/api/networkProtocols/:id', [restServer.isLoggedIn],
    function (req, res) {
      modelAPI.networkProtocols.load(req.params.id).then(function (np) {
        // restServer.respondJson(res, null, np)
        restServer.respond(res, 200, formatRelationshipsOut(np))
      })
        .catch(function (err) {
          logger.error('Error getting networkProtocol ' + req.params.id + ': ', err)
          restServer.respond(res, err)
        })
    })

  /**
     * @apiDescription Creates a new Network Protocols record.
     *
     * @api {post} /api/networkProtocols Create Network Protocol
     * @apiGroup Network Protocols
     * @apiPermission System Admin
     * @apiHeader {String} Authorization The Create Session's returned token
     *      prepended with "Bearer "
     * @apiParam (Request Body) {String} name The Network Protocol's name
     * @apiParam (Request Body) {String} protocolHandler The Network Protocol
     *      node code that communicates with a remote Network.
     * @apiParam (Request Body) {String} networkTypeId The Id of the Network
     *      Type that the Network Protocol accepts as input.
     * @apiExample {json} Example body:
     *      {
     *          "name": "LoRa Server",
     *          "protocolHandler": "LoRaOpenSource.js"
     *          "networkTypeId": 1
     *      }
     * @apiSuccess {String} id The new Network Protocol's id.
     * @apiVersion 1.2.1
     */
  app.post('/api/networkProtocols', [restServer.isLoggedIn,
    restServer.fetchCompany,
    restServer.isAdminCompany],
  function (req, res) {
    let methodNotAllowed = {
      error: 'POST to /api/networkProtocols is not allowed.  Please see documentation for more details.'
    }
    restServer.respond(res, 405, methodNotAllowed)
    // var rec = req.body
    // // You can't specify an id.
    // if (rec.id) {
    //   restServer.respond(res, 400, "Cannot specify the networkProtocol's id in create")
    //   return
    // }
    //
    // // Verify that required fields exist.
    // if (!rec.name || !rec.networkTypeId || !rec.protocolHandler) {
    //   restServer.respond(res, 400, 'Missing required data')
    //   return
    // }
    //
    // // Do the add.
    // modelAPI.networkProtocols.create(
    //   rec.name,
    //   rec.networkTypeId,
    //   rec.protocolHandler).then(function (rec) {
    //   var send = {}
    //   send.id = rec.id
    //   restServer.respondJson(res, 200, send)
    // })
    //   .catch(function (err) {
    //     restServer.respond(res, err)
    //   })
  })

  /**
     * @apiDescription Updates the Network Protocol record with the specified
     *      id.
     *
     * @api {put} /api/networkProtocols/:id Update Network Protocol
     * @apiGroup Network Protocols
     * @apiPermission System Admin
     * @apiHeader {String} Authorization The Create Session's returned token
     *      prepended with "Bearer "
     * @apiParam (URL Parameters) {String} networkProtocolHandlersid The Network Protocol's id
     * @apiParam (Request Body) {String} [name] The Network Protocol's name
     * @apiParam (Request Body) {String} [protocolHandler] The Network Protocol
     *      node code that communicates with a remote Network.
     * @apiParam (Request Body) {String} [networkTypeId] The Id of the Network
     *      Type that the Network Protocol accepts as input.
     * @apiExample {json} Example body:
     *      {
     *          "name": "LoRa Server",
     *          "protocolHandler": "LoRaOpenSource.js",
     *          "networkTypeId": 1
     *      }
     * @apiVersion 1.2.1
     */
  app.put('/api/networkProtocols/:id', [restServer.isLoggedIn,
    restServer.fetchCompany,
    restServer.isAdminCompany],
  function (req, res) {
    var data = {}
    data.id = req.params.id
    // We'll start by getting the company, as a read is much less expensive
    // than a write, and then we'll be able to tell if anything really
    // changed before we even try to write.
    modelAPI.networkProtocols.load(req.params.id).then(function (np) {
      // Fields that may exist in the request body that can change.  Make
      // sure they actually differ, thnetworkProtocolHandlersough.
      var changed = 0
      if ((req.body.name) &&
                 (req.body.name !== np.name)) {
        data.name = req.body.name
        ++changed
      }
      if (req.body.protocolHandler) {
        if (req.body.protocolHandler !== np.protocolHandler) {
          data.protocolHandler = req.body.protocolHandler
          ++changed
        }
      }
      if (req.body.networkTypeId) {
        if (req.body.networkTypeId !== np.networkTypeId) {
          data.networkTypeId = req.body.networkTypeId
          ++changed
        }
      }

      if (changed === 0) {
        // No changes.  But returning 304 apparently causes Apache to strip
        // CORS info, causing the browser to throw a fit.  So just say,
        // "Yeah, we did that.  Really.  Trust us."
        restServer.respond(res, 204)
      }
      else {
        // Do the update.
        modelAPI.networkProtocols.update(data).then(function () {
          restServer.respond(res, 204)
        })
          .catch(function (err) {
            restServer.respond(res, err)
          })
      }
    })
      .catch(function (err) {
        logger.error('Error getting networkProtocol ' + data.id + ': ', err)
        restServer.respond(res, err)
      })
  })

  /**
     * @apiDescription Deletes the Network Protocol record with the specified
     *      id.
     *
     * @api {delete} /api/networkProtocols/:id Delete Network Protocol
     * @apiGroup Network Protocols
     * @apiPermission System AdminnetworkProtocolHandlers
     * @apiHeader {String} Authorization The Create Session's returned token
     *      prepended with "Bearer "
     * @apiParam (URL Parameters) {String} id The Network Protocol's id
     * @apiVersion 1.2.1
     */
  app.delete('/api/networkProtocols/:id', [restServer.isLoggedIn,
    restServer.fetchCompany,
    restServer.isAdminCompany],
  function (req, res) {
    let methodNotAllowed = {
      error: 'DELETE to /api/networkProtocols is not allowed.  Please see documentation for more details.'
    }
    restServer.respond(res, 405, methodNotAllowed)
    // var id = req.params.id
    // modelAPI.networkProtocols.remove(id).then(function () {
    //   restServer.respond(res, 204)
    // })
    //   .catch(function (err) {
    //     logger.error('Error deleting network protocol ' + id + ': ', err)
    //     restServer.respond(res, err)
    //   })
  })

  /**
     * @apiDescription Gets the Network Protocol Handlers avalible.
     *
     * @api {get} /api/networkProtocolsHandlers/ Get Network Protocol
     * @apiGroup Network Protocols
     * @apiPermission Any logged-in user.
     * @apiHeader {String} Authorization The Create Session's returned token
     *      prepended with "Bearer "
     * @apiSuccess {Array} array of protocol handlers available.
     * @apiVersion 1.2.1
     */
  app.get('/api/networkProtocolHandlers/', [restServer.isLoggedIn],
    async function (req, res) {
      const [ records ] = await modelAPI.networkProtocols.list()
      const handlerList = records
        .map(x => x.protocolHandler)
        .map(x => ({ id: x, name: x }))
      restServer.respondJson(res, null, handlerList)
    })
}

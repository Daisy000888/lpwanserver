// Configuration access.
const config = require('../config')

//* *****************************************************************************
// The ReportingProtocol interface.
//* *****************************************************************************
function ReportingProtocol () {
  this.impl = require('./dao/' +
                             config.get('impl_directory') +
                             '/reportingProtocols.js')
}

ReportingProtocol.prototype.retrieveReportingProtocols = function () {
  return this.impl.retrieveReportingProtocols()
}

ReportingProtocol.prototype.retrieveReportingProtocol = function (id) {
  return this.impl.retrieveReportingProtocol(id)
}

ReportingProtocol.prototype.createReportingProtocol = function (name, protocolHandler) {
  return this.impl.createReportingProtocol(name, protocolHandler)
}

ReportingProtocol.prototype.updateReportingProtocol = function (record) {
  return this.impl.updateReportingProtocol(record)
}

ReportingProtocol.prototype.deleteReportingProtocol = function (id) {
  return this.impl.deleteReportingProtocol(id)
}

module.exports = ReportingProtocol

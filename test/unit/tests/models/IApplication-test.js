// eslint-disable-next-line no-unused-vars
var assert = require('assert')
// eslint-disable-next-line no-unused-vars
var chai = require('chai')
// eslint-disable-next-line no-unused-vars
var should = chai.should()
const { prisma } = require('../../../../app/generated/prisma-client')
var { Application: TestModule } = require('../../../../app/models/IApplication')
const modelAPIMock = require('../../mock/ModelAPI-mock')

const testName = 'Application'

// content of index.js
const http = require('http')
const port = 5000

const requestHandler = (request, response) => {
  console.log(request.url)
  response.statusCode = 201
  response.end(JSON.stringify({}))
}

const server = http.createServer(requestHandler)

function assertAppProps (actual) {
  actual.should.have.property('name')
  actual.should.have.property('description')
  actual.company.should.have.property('id')
  actual.reportingProtocol.should.have.property('id')
  actual.should.have.property('baseUrl')
  actual.should.have.property('id')
}

describe('Unit Tests for ' + testName, () => {
  let appId = ''
  before('Setup ENV', done => {
    server.listen(port, (err) => {
      if (err) return done(err)
      done()
    })
  })
  after('Shutdown', async () => {
    server.close()
  })
  it(testName + ' Construction', () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
  })
  it(testName + ' Empty Retrieval', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.list({}, { includeTotal: true })
    actual.should.have.length(2)
  })
  it(testName + ' Create', async () => {
    const cos = await prisma.companies()
    const rProtos = await prisma.reportingProtocols()
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.create({
      name: 'test',
      description: 'test application',
      companyId: cos[0].id,
      reportingProtocolId: rProtos[0].id,
      baseUrl: 'http://localhost:5000'
    })
    assertAppProps(actual)
    appId = actual.id
  })
  it(testName + ' Retrieve', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.load(appId)
    assertAppProps(actual)
  })
  it(testName + ' Update', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    let updated = {
      id: appId,
      name: 'test',
      description: 'updated description',
      baseUrl: 'http://localhost:5000'
    }
    const actual = await testModule.update(updated)
    assertAppProps(actual)
    actual.description.should.equal(updated.description)
  })
  it(testName + ' Start', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.startApplication(appId)
    console.log(actual)
  })
  it(testName + ' Test', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.testApplication(appId, { name: 'test' })
    console.log(actual)
  })
  it.skip(testName + ' Pass Data to Application', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.passDataToApplication(appId, 1, { name: 'test' })
    actual.should.be(204)
  })
  it(testName + ' Stop', async () => {
    let testModule = new TestModule(modelAPIMock)
    should.exist(testModule)
    const actual = await testModule.stopApplication(appId)
    console.log(actual)
  })
})

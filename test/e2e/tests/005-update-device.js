/* eslint-disable no-unused-vars */
let chai = require('chai')
let chaiHttp = require('chai-http')
const { createApp } = require('../../../app/rest-server/app')
let should = chai.should()
let setup = require('../setup.js')
const Lora1 = require('../../networks/lora-v1')
const Lora2 = require('../../networks/lora-v2')
const { prisma } = require('../../../app/generated/prisma-client')

chai.use(chaiHttp)
let server

describe('E2E Test for Updating a Device Use Case #193', () => {
  let reportingProtocolId
  let networkTypeId

  let adminToken
  let appId1
  let anlId1
  let dpId1
  let deviceId1
  let dnlId1
  let remoteApp1
  let remoteApp2
  let remoteDeviceProfileId
  let remoteDeviceProfileId2

  const appName = 'UPDV'
  const appDescription = 'UPDV Description'
  const baseUrl = 'http://localhost:5086'

  const device = {
    'applicationId': '',
    'name': 'UPDV001',
    'description': 'Soil Node Model 001',
    'deviceModel': 'Mark1'
  }

  const deviceUpdate = {
    'applicationId': '',
    'name': 'UPDV001',
    'description': 'Updated Soil Node Model 001',
    'deviceModel': 'Mark1'
  }

  let deviceProfile
  let deviceNTL
  let deviceNTLUpdate
  let application

  before(async () => {
    const app = await createApp()
    server = chai.request(app).keepOpen()
    const reportingProtocols = await prisma.reportingProtocols({ first: 1 })
    reportingProtocolId = reportingProtocols[0].id
    const nwkTypes = await prisma.networkTypes({ first: 1 })
    networkTypeId = nwkTypes[0].id
    await setup.start()

    deviceProfile = {
      networkTypeId,
      'name': 'LoRaSoilReaderB',
      'description': 'Soil Sensor that works with LoRa',
      'networkSettings': {
        'name': 'LoRaSoilReaderB',
        'macVersion': '1.0.0',
        'regParamsRevision': 'A',
        'supportsJoin': true
      }
    }

    deviceNTL = {
      'deviceId': '',
      networkTypeId,
      'deviceProfileId': '',
      'networkSettings': {
        'devEUI': '0080000000000501',
        name: device.name,
        description: device.description,
        deviceKeys: {
          'appKey': '112233445566889900112233445511'
        }
      }
    }

    deviceNTLUpdate = {
      'deviceId': '',
      networkTypeId,
      'deviceProfileId': '',
      'networkSettings': {
        'devEUI': '0080000000000501',
        name: deviceUpdate.name,
        description: deviceUpdate.description,
        deviceKeys: {
          'appKey': '112233445566889900112233445522'
        }
      }
    }

    application = {
      'name': appName,
      'description': appDescription,
      'baseUrl': baseUrl,
      'reportingProtocolId': reportingProtocolId
    }
  })

  describe('Verify Login and Administration of Users Works', () => {
    it('Admin Login to LPWan Server', (done) => {
      server
        .post('/api/sessions')
        .send({'username': 'admin', 'password': 'password'})
        .end(function (err, res) {
          if (err) done(err)
          if (err) done(err)
          res.should.have.status(200)
          adminToken = res.text
          done()
        })
    })
  })
  describe('Create Application', () => {
    let applicationNetworkSettings = {
      'description': appDescription,
      'name': appName
    }
    it('should return 200 on admin', function (done) {
      server
        .post('/api/applications')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(application)
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(201)
          let ret = JSON.parse(res.text)
          appId1 = ret.id
          device.applicationId = appId1
          done()
        })
    })

    it('should return 200 on get', function (done) {
      server
        .get('/api/applications/' + appId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          let appObj = JSON.parse(res.text)
          appObj.should.have.property('id')
          appObj.should.have.property('name')
          appObj.should.have.property('description')
          appObj.should.have.property('baseUrl')
          appObj.should.have.property('reportingProtocolId')

          appObj.name.should.equal(appName)
          appObj.description.should.equal(appDescription)
          appObj.baseUrl.should.equal(baseUrl)
          appObj.reportingProtocolId.should.equal(reportingProtocolId)

          done()
        })
    })
    it('Create Network Type Links for Application', function (done) {
      server
        .post('/api/application-network-type-links')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send({
          'applicationId': appId1,
          networkTypeId,
          'networkSettings': applicationNetworkSettings
        })
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(201)
          let ret = JSON.parse(res.text)
          anlId1 = ret.id
          done()
        })
    })
    it('should return 200 on get', function (done) {
      server
        .get('/api/application-network-type-links/' + anlId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          let appObj = JSON.parse(res.text)
          console.log(appObj)
          done()
        })
    })
  })
  describe('Create Device Profile for Application', () => {
    it('Create Device Profile', function (done) {
      server
        .post('/api/device-profiles')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(deviceProfile)
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(201)
          let ret = JSON.parse(res.text)
          dpId1 = ret.id
          done()
        })
    })
    it('should return 200 on get', function (done) {
      server
        .get('/api/device-profiles/' + dpId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          let dpObj = JSON.parse(res.text)
          dpObj.name.should.equal(deviceProfile.name)
          dpObj.description.should.equal(deviceProfile.description)
          dpObj.networkTypeId.should.equal(deviceProfile.networkTypeId)
          done()
        })
    })
  })
  describe('Create Device for Application', () => {
    it('POST Device', function (done) {
      server
        .post('/api/devices')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(device)
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(201)
          let ret = JSON.parse(res.text)
          deviceId1 = ret.id
          done()
        })
    })

    it('should return 200 on get', function (done) {
      server
        .get('/api/devices/' + deviceId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          let devObj = JSON.parse(res.text)
          console.log(devObj)
          devObj.name.should.equal(device.name)
          devObj.description.should.equal(device.description)
          devObj.deviceModel.should.equal(device.deviceModel)
          done()
        })
    })
    it('Create Device NTL', function (done) {
      deviceNTL.deviceId = deviceId1
      deviceNTL.deviceProfileId = dpId1
      server
        .post('/api/device-network-type-links')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(deviceNTL)
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(201)
          var dnlObj = JSON.parse(res.text)
          console.log(dnlObj)
          dnlId1 = dnlObj.id
          done()
        })
    })

    it('should return 200 on get', function (done) {
      server
        .get('/api/device-network-type-links/' + dnlId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          var dnlObj = JSON.parse(res.text)
          dnlObj.deviceId.should.equal(deviceNTL.deviceId)
          dnlObj.networkTypeId.should.equal(deviceNTL.networkTypeId)
          dnlObj.deviceProfileId.should.equal(deviceNTL.deviceProfileId)
          done()
        })
    })
  })
  describe('Verify LoRaServer V1 has application', function () {
    it('Verify the LoRaServer V1 Application Exists', async () => {
      const { result } = await Lora1.client.listApplications(Lora1.network, { limit: 100 })
      const app = result.find(x => x.name === appName)
      should.exist(app)
      remoteApp1 = app.id
    })
    it('Verify the LoRaServer V1 Application Exists', async () => {
      const app = await Lora1.client.loadApplication(Lora1.network, remoteApp1)
      app.should.have.property('id')
      app.should.have.property('name')
      app.should.have.property('description')
      app.should.have.property('organizationID')
      app.should.have.property('serviceProfileID')
      app.should.have.property('payloadCodec')
      app.should.have.property('payloadEncoderScript')
      app.should.have.property('payloadDecoderScript')
      app.name.should.equal(appName)
    })
    it('Verify the LoRaServer V1 Device Profile Exists', async () => {
      const { result } = await Lora1.client.listDeviceProfiles(Lora1.network, { limit: 100 })
      const dp = result.find(x => x.name === deviceProfile.networkSettings.name)
      should.exist(dp)
      remoteDeviceProfileId = dp.id
    })
    it('Verify the LoRaServer V1 Device Profile Exists', async () => {
      const dp = await Lora1.client.loadDeviceProfile(Lora1.network, remoteDeviceProfileId)
      dp.should.have.property('name')
      dp.name.should.equal(deviceProfile.networkSettings.name)
      dp.should.have.property('organizationID')
      dp.should.have.property('networkServerID')
      dp.should.have.property('createdAt')
      dp.should.have.property('updatedAt')
      dp.should.have.property('macVersion')
      dp.should.have.property('regParamsRevision')
      dp.macVersion.should.equal(deviceProfile.networkSettings.macVersion)
      dp.regParamsRevision.should.equal(deviceProfile.networkSettings.regParamsRevision)
    })
    it('Verify the LoRaServer V1 Device Exists', async () => {
      const device = await Lora1.client.loadDevice(Lora1.network, deviceNTL.networkSettings.devEUI)
      device.should.have.property('name')
      device.should.have.property('devEUI')
      device.should.have.property('applicationID')
      device.should.have.property('description')
      device.should.have.property('deviceProfileID')
      device.should.have.property('deviceStatusBattery')
      device.should.have.property('deviceStatusMargin')
      device.should.have.property('lastSeenAt')
      device.should.have.property('skipFCntCheck')
      device.name.should.equal(deviceNTL.networkSettings.name)
      device.devEUI.should.equal(deviceNTL.networkSettings.devEUI)
      device.deviceProfileID.should.equal(remoteDeviceProfileId)
    })
  })
  describe('Verify LoRaServer V2 has application', function () {
    it('Verify the LoRaServer V2 Application Exists', async () => {
      const { result } = await Lora2.client.listApplications(Lora2.network, { limit: 100 })
      const app = result.find(x => x.name === appName)
      should.exist(app)
      remoteApp2 = app.id
    })
    it('Verify the LoRaServer V2 Application Exists', async () => {
      const app = await Lora2.client.loadApplication(Lora2.network, remoteApp2)
      app.should.have.property('id')
      app.should.have.property('name')
      app.should.have.property('description')
      app.should.have.property('organizationID')
      app.should.have.property('serviceProfileID')
      app.should.have.property('payloadCodec')
      app.should.have.property('payloadEncoderScript')
      app.should.have.property('payloadDecoderScript')
      app.name.should.equal(appName)
    })
    it('Verify the LoRaServer V2 Device Profile Exists', async () => {
      const { result } = await Lora2.client.listDeviceProfiles(Lora2.network, { limit: 100 })
      const dp = result.find(x => x.name === deviceProfile.name)
      should.exist(dp)
      remoteDeviceProfileId2 = dp.id
    })
    it('Verify the LoRaServer V2 Device Profile Exists', async () => {
      const dp = await Lora2.client.loadDeviceProfile(Lora2.network, remoteDeviceProfileId2)
      dp.should.have.property('name')
      dp.name.should.equal(deviceProfile.networkSettings.name)
      dp.should.have.property('organizationID')
      dp.should.have.property('networkServerID')
      dp.should.have.property('macVersion')
      dp.should.have.property('regParamsRevision')
      dp.macVersion.should.equal(deviceProfile.networkSettings.macVersion)
      dp.regParamsRevision.should.equal(deviceProfile.networkSettings.regParamsRevision)
    })
    it('Verify the LoRaServer V2 Device Exists', async () => {
      const device = await Lora2.client.loadDevice(Lora2.network, deviceNTL.networkSettings.devEUI)
      device.should.have.property('name')
      device.should.have.property('devEUI')
      device.should.have.property('applicationID')
      device.should.have.property('description')
      device.should.have.property('deviceProfileID')
      device.should.have.property('skipFCntCheck')
      device.should.have.property('deviceStatusBattery')
      device.should.have.property('deviceStatusMargin')
      device.should.have.property('lastSeenAt')
      device.name.should.equal(deviceNTL.networkSettings.name)
      device.devEUI.should.equal(deviceNTL.networkSettings.devEUI)
      device.deviceProfileID.should.equal(remoteDeviceProfileId2)
    })
  })
  describe('Update Device', () => {
    it('Update Device', function (done) {
      server
        .put('/api/devices/' + deviceId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(deviceUpdate)
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(204)
          done()
        })
    })
    it('Verify Device Updated', function (done) {
      server
        .get('/api/devices/' + deviceId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          let devObj = JSON.parse(res.text)
          devObj.should.have.property('id')
          devObj.should.have.property('name')
          devObj.should.have.property('description')
          devObj.should.have.property('deviceModel')
          devObj.name.should.equal(deviceUpdate.name)
          devObj.id.should.equal(deviceId1)
          devObj.description.should.equal(deviceUpdate.description)
          devObj.deviceModel.should.equal(deviceUpdate.deviceModel)
          done()
        })
    })
    it('Update Network Type Links for Application', function (done) {
      server
        .put('/api/device-network-type-links/' + dnlId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send({
          'networkSettings': deviceNTLUpdate.networkSettings
        })
        .end(function (err, res) {
          if (err) done(err)
          // TODO:  Why does PUT do 200 sometimes and 204 others?
          res.should.have.status(204)
          done()
        })
    })
    it('Verify Device NTL Updated', function (done) {
      server
        .get('/api/device-network-type-links/' + dnlId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          let deviceNTL = JSON.parse(res.text)
          console.log(deviceNTL)
          done()
        })
    })
  })
  describe('Verify device updated on LoRaServer networks', function () {
    it('Verify device updated on LoRaServer V1', async () => {
      const device = await Lora1.client.loadDevice(Lora1.network, deviceNTL.networkSettings.devEUI)
      device.description.should.equal(deviceUpdate.description)
    })
    it('Verify device updated on LoRaServer V2', async () => {
      const device = await Lora1.client.loadDevice(Lora1.network, deviceNTL.networkSettings.devEUI)
      device.description.should.equal(deviceUpdate.description)
    })
  })
})

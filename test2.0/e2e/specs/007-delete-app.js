let chai = require('chai')
let chaiHttp = require('chai-http')
let app = require('../../../restApp.js')
let setup = require('../setup.js')
let appLogger = require('../../../rest/lib/appLogger.js')
let Data = require('../../data')
const { assertEqualProps } = require('../../lib/helpers')
const Lora1 = require('../networks/lora-v1')
const Lora2 = require('../networks/lora-v2')
const Loriot = require('../networks/loriot')
const Ttn = require('../networks/ttn')

var should = chai.should()
chai.use(chaiHttp)
let server = chai.request(app).keepOpen()

const describeTTN = process.env.TTN_ENABLED === 'true' ? describe : describe.skip.bind(describe)
const describeLoriot = process.env.LORIOT_ENABLED === 'true' ? describe : describe.skip.bind(describe)

let adminToken = ''
let remoteApp1 = ''
let remoteApp2 = ''
let remoteAppLoriot = ''
let remoteDeviceProfileId = ''
let remoteDeviceProfileId2 = ''

const testData = {
  ...Data.applicationTemplates.default({
    name: 'DLAP',
    companyId: 2
  }),
  ...Data.deviceTemplates.weatherNode({
    name: 'DLAP001',
    companyId: 2,
    devEUI: '0080000000000701'
  })
}

describe('E2E Test for Deleting an Application Use Case #191', () => {
  before(() => setup.start())

  describe('Verify Login and Administration of Users Works', () => {
    it('Admin Login to LPWan Server', (done) => {
      server
        .post('/api/sessions')
        .send({'login_username': 'admin', 'login_password': 'password'})
        .end(function (err, res) {
          if (err) done(err)
          res.should.have.status(200)
          adminToken = res.text
          done()
        })
    })
  })
  describe('Create Application', () => {
    it('should return 200 on admin', function (done) {
      server
        .post('/api/applications')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(testData.app)
        .end(function (err, res) {
          res.should.have.status(200)
          let ret = JSON.parse(res.text)
          testData.app.id = ret.id
          testData.device.applicationId = ret.id
          testData.appNTL.applicationId = ret.id
          done()
        })
    })
    it('should return 200 on get', function (done) {
      server
        .get('/api/applications/' + testData.app.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          res.should.have.status(200)
          let appObj = JSON.parse(res.text)

          Object.keys(testData.app).forEach(prop => {
            appObj[prop].should.equal(testData.app[prop])
          })

          done()
        })
    })
    it('Create Network Type Links for Application', function (done) {
      server
        .post('/api/applicationNetworkTypeLinks')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(testData.appNTL)
        .end(function (err, res) {
          res.should.have.status(200)
          let ret = JSON.parse(res.text)
          testData.appNTL.id = ret.id
          done()
        })
    })
    it('should return 200 on get', function (done) {
      server
        .get('/api/applicationNetworkTypeLinks/' + testData.appNTL.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
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
        .post('/api/deviceProfiles')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(testData.deviceProfile)
        .end(function (err, res) {
          res.should.have.status(200)
          let ret = JSON.parse(res.text)
          testData.deviceProfile.id = ret.id
          testData.deviceNTL.deviceProfileId = ret.id
          done()
        })
    })
    it('should return 200 on get', function (done) {
      server
        .get('/api/deviceProfiles/' + testData.deviceProfile.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          res.should.have.status(200)
          assertEqualProps(
            ['name', 'description', 'networkTypeId', 'companyId'],
            JSON.parse(res.text),
            testData.deviceProfile
          )
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
        .send(testData.device)
        .end(function (err, res) {
          appLogger.log(res)
          res.should.have.status(200)
          let ret = JSON.parse(res.text)
          testData.device.id = ret.id
          testData.deviceNTL.deviceId = ret.id
          done()
        })
    })

    it('should return 200 on get', function (done) {
      server
        .get('/api/devices/' + testData.device.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          res.should.have.status(200)
          let devObj = JSON.parse(res.text)
          console.log(devObj)
          assertEqualProps(
            ['name', 'description', 'deviceModel'],
            devObj,
            testData.device
          )
          done()
        })
    })
    it('Create Device NTL', function (done) {
      server
        .post('/api/deviceNetworkTypeLinks')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send(testData.deviceNTL)
        .end(function (err, res) {
          res.should.have.status(200)
          var dnlObj = JSON.parse(res.text)
          console.log(dnlObj)
          testData.deviceNTL.id = dnlObj.id
          done()
        })
    })

    it('should return 200 on get', function (done) {
      server
        .get('/api/deviceNetworkTypeLinks/' + testData.deviceNTL.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .send()
        .end(function (err, res) {
          res.should.have.status(200)
          var dnlObj = JSON.parse(res.text)
          assertEqualProps(
            ['deviceId', 'networkTypeId', 'deviceProfileId'],
            dnlObj,
            testData.deviceNTL
          )
          done()
        })
    })
  })
  describe('Verify LoRaServer V1 has application', function () {
    it('Verify the LoRaServer V1 Application Exists', async () => {
      const { result } = await Lora1.client.listApplications(Lora1.network, { limit: 100 })
      const app = result.find(x => x.name === testData.app.name)
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
      app.name.should.equal(testData.app.name)
    })
    it('Verify the LoRaServer V1 Device Profile Exists', async () => {
      const { result } = await Lora1.client.listDeviceProfiles(Lora1.network, { limit: 100 })
      const dp = result.find(x => x.name === testData.deviceProfile.networkSettings.name)
      should.exist(dp)
      remoteDeviceProfileId = dp.id
    })
    it('Verify the LoRaServer V1 Device Profile Exists', async () => {
      const dp = await Lora1.client.loadDeviceProfile(Lora1.network, remoteDeviceProfileId)
      dp.should.have.property('name')
      dp.name.should.equal(testData.deviceProfile.networkSettings.name)
      dp.should.have.property('organizationID')
      dp.should.have.property('networkServerID')
      dp.should.have.property('createdAt')
      dp.should.have.property('updatedAt')
      dp.should.have.property('macVersion')
      dp.should.have.property('regParamsRevision')
      dp.macVersion.should.equal(testData.deviceProfile.networkSettings.macVersion)
      dp.regParamsRevision.should.equal(testData.deviceProfile.networkSettings.regParamsRevision)
    })
    it('Verify the LoRaServer V1 Device Exists', async () => {
      const device = await Lora1.client.loadDevice(Lora1.network, testData.deviceNTL.networkSettings.devEUI)
      device.should.have.property('name')
      device.should.have.property('devEUI')
      device.should.have.property('applicationID')
      device.should.have.property('description')
      device.should.have.property('deviceProfileID')
      device.should.have.property('deviceStatusBattery')
      device.should.have.property('deviceStatusMargin')
      device.should.have.property('lastSeenAt')
      device.should.have.property('skipFCntCheck')
      device.name.should.equal(testData.deviceNTL.networkSettings.name)
      device.devEUI.should.equal(testData.deviceNTL.networkSettings.devEUI)
      device.deviceProfileID.should.equal(remoteDeviceProfileId)
    })
  })
  describe('Verify LoRaServer V2 has application', function () {
    it('Verify the LoRaServer V2 Application Exists', async () => {
      const { result } = await Lora2.client.listApplications(Lora2.network, { limit: 100 })
      const app = result.find(x => x.name === testData.app.name)
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
      app.name.should.equal(testData.app.name)
    })
    it('Verify the LoRaServer V2 Device Profile Exists', async () => {
      const { result } = await Lora2.client.listDeviceProfiles(Lora2.network, { limit: 100 })
      const dp = result.find(x => x.name === testData.deviceProfile.name)
      should.exist(dp)
      remoteDeviceProfileId2 = dp.id
    })
    it('Verify the LoRaServer V2 Device Profile Exists', async () => {
      const dp = await Lora2.client.loadDeviceProfile(Lora2.network, remoteDeviceProfileId2)
      dp.should.have.property('name')
      dp.name.should.equal(testData.deviceProfile.networkSettings.name)
      dp.should.have.property('organizationID')
      dp.should.have.property('networkServerID')
      dp.should.have.property('macVersion')
      dp.should.have.property('regParamsRevision')
      dp.macVersion.should.equal(testData.deviceProfile.networkSettings.macVersion)
      dp.regParamsRevision.should.equal(testData.deviceProfile.networkSettings.regParamsRevision)
    })
    it('Verify the LoRaServer V2 Device Exists', async () => {
      const device = await Lora2.client.loadDevice(Lora2.network, testData.deviceNTL.networkSettings.devEUI)
      device.should.have.property('name')
      device.should.have.property('devEUI')
      device.should.have.property('applicationID')
      device.should.have.property('description')
      device.should.have.property('deviceProfileID')
      device.should.have.property('skipFCntCheck')
      device.should.have.property('deviceStatusBattery')
      device.should.have.property('deviceStatusMargin')
      device.should.have.property('lastSeenAt')
      device.name.should.equal(testData.deviceNTL.networkSettings.name)
      device.devEUI.should.equal(testData.deviceNTL.networkSettings.devEUI)
      device.deviceProfileID.should.equal(remoteDeviceProfileId2)
    })
  })
  describeLoriot('Verify Loriot has application', function () {
    it('Verify the Loriot Application Exists', async () => {
      const { result } = await Loriot.client.listApplications(Loriot.network, { limit: 100 })
      const app = result.find(x => x.name === testData.app.name)
      should.exist(app)
      remoteAppLoriot = app.id
    })
    it('Verify the Loriot Application Exists', async () => {
      const app = await Loriot.client.loadApplication(Loriot.network, remoteAppLoriot)
      app.should.have.property('_id')
      app.should.have.property('name')
      app.name.should.equal(testData.app.name)
    })
    it('Verify the LoRaServer V2 Device Exists', async () => {
      const device = await Loriot.client.loadDevice(Loriot.network, testData.deviceNTL.networkSettings.devEUI)
      device.should.have.property('title')
      device.should.have.property('deveui')
      device.should.have.property('description')
      device.title.should.equal(testData.deviceNTL.networkSettings.name)
      device.deveui.should.equal(testData.deviceNTL.networkSettings.devEUI)
    })
  })
  describe('Remove Device from Application', () => {
    it('Delete Device NTL', function (done) {
      server
        .delete(`/api/deviceNetworkTypeLinks/${testData.deviceNTL.id}`)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(204)
          done()
        })
    })
    it('should return 404 on get', function (done) {
      server
        .get(`/api/deviceNetworkTypeLinks/${testData.deviceNTL.id}`)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(404)
          done()
        })
    })
    it('Delete Device', function (done) {
      server
        .delete(`/api/devices/${testData.device.id}`)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(204)
          done()
        })
    })
    it('should return 404 on get', function (done) {
      server
        .get(`/api/devices/${testData.device.id}`)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(404)
          done()
        })
    })
    it('Delete Device Profile', function (done) {
      server
        .delete('/api/deviceProfiles/' + testData.deviceProfile.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(200)
          done()
        })
    })
    it('should return 404 on get', function (done) {
      server
        .get('/api/deviceProfiles/' + testData.deviceProfile.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(404)
          done()
        })
    })
  })
  describe('Verify Device Removed from LoRaServer Networks', () => {
    it('Verify the LoRaServer V1 Device Does Not Exist', async () => {
      try {
        await Lora1.client.loadDevice(Lora1.network, testData.deviceNTL.networkSettings.devEUI)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
    it('Verify the LoRaServer V1 Device Profile Does Not Exist', async () => {
      try {
        await Lora1.client.loadDeviceProfile(Lora1.network, remoteDeviceProfileId)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
    it('Verify the LoRaServer V2 Device Does Not Exist', async () => {
      try {
        await Lora2.client.loadDevice(Lora2.network, testData.deviceNTL.networkSettings.devEUI)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
    it('Verify the LoRaServer V2 Device Profile Does Not Exist', async () => {
      try {
        await Lora2.client.loadDeviceProfile(Lora2.network, remoteDeviceProfileId2)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
  })
  describeLoriot('Verify Device Removed from Loriot', () => {
    it('Verify the Loriot Device Does Not Exist', async () => {
      try {
        await Loriot.client.loadDevice(Loriot.network, testData.deviceNTL.networkSettings.devEUI)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
  })
  describe('Delete Application', () => {
    it('Delete Network Type Links for Application', function (done) {
      server
        .delete('/api/applicationNetworkTypeLinks/' + testData.appNTL.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(200)
          done()
        })
    })
    it('should return 404 on get', function (done) {
      server
        .get('/api/applicationNetworkTypeLinks/' + testData.appNTL.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(404)
          done()
        })
    })
    it('should return 204 on delete', function (done) {
      server
        .delete('/api/applications/' + testData.app.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(204)
          done()
        })
    })
    it('should return 404 on get', function (done) {
      server
        .get('/api/applications/' + testData.app.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send()
        .end(function (err, res) {
          res.should.have.status(404)
          done()
        })
    })
  })
  describe('Verify Application Removed from LoRaServer Networks', () => {
    it('Verify the LoRaServer V1 Application Does Not Exist', async () => {
      try {
        await Lora1.client.loadApplication(Lora1.network, remoteApp1)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
    it('Verify the LoRaServer V2 Application Does Not Exist', async () => {
      try {
        await Lora2.client.loadApplication(Lora2.network, remoteApp2)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
  })
  describeLoriot('Verify Application Removed from Loriot', () => {
    it('Verify the Loriot Application Does Not Exist', async () => {
      try {
        await Loriot.client.loadApplication(Loriot.network, remoteAppLoriot)
      }
      catch (err) {
        err.statusCode.should.equal(404)
      }
    })
  })
  describeLoriot('Remove Loriot apps and devices', () => {
    it('Remove Loriot apps and devices', async () => {
      let { apps } = Loriot.client.listApplications(Loriot.network, { page: 1, perPage: 100 })
      let appDevices = await Promise.all(apps.map(async app => {
        const appId = parseInt(app._id, 10)
        const { devices } = await Loriot.client.listDevices(Loriot.network, appId, { page: 1, perPage: 100 })
        return { appId, devices }
      }))
      await Promise.all(appDevices.map(async ({ appId, devices }) => {
        await Promise.all(devices.map(dev => Loriot.client.deleteDevice(Loriot.network, appId, dev.id)))
        await Loriot.client.deleteApplication(Loriot.network, appId)
      }))
    })
  })
  describeTTN('Remove TTN apps and devices', () => {
    it('Remove TTN apps and devices', async () => {
      const deleteApp = async app => {
        try {
          const devices = await Ttn.client.listDevices(Ttn.network, app.id)
          await Promise.all(devices.map(dev => Ttn.client.deleteDevice(Ttn.network, app.id, dev.id)))
          await Ttn.client.unregisterApplication(Ttn.network, app.id)
        }
        catch (err) {
        }
        await Ttn.client.deleteAccountApplication(Ttn.network, app.id)
      }
      let apps = await Ttn.client.listApplications(Ttn.network)
      await Promise.all(apps.map(deleteApp))
    })
  })
})
/* eslint-disable handle-callback-err */
var assert = require('assert')
var chai = require('chai')
var chaiHttp = require('chai-http')
const { createApp } = require('../../../app/rest-server/app')
var should = chai.should()

chai.use(chaiHttp)
var server

var npId1
const NUMBER_PROTOCOLS = 5

describe('NetworkProtocols', function () {
  var adminToken

  before('User Sessions', async () => {
    const app = await createApp()
    server = chai.request(app).keepOpen()
    const res = await server
      .post('/api/sessions')
      .send({ 'username': 'admin', 'password': 'password' })
    adminToken = res.text
  })

  describe('GET /api/network-protocols', function () {
    it('should return 200 with 4 protocols on admin', function (done) {
      server
        .get('/api/network-protocols')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .end(function (err, res) {
          res.should.have.status(200)
          var result = JSON.parse(res.text)
          result.records.should.be.instanceof(Array)
          result.records.should.have.length(NUMBER_PROTOCOLS)
          result.totalCount.should.equal(NUMBER_PROTOCOLS)
          done()
        })
    })

    it('should return 200 with 4 protocols on user', function (done) {
      server
        .get('/api/network-protocols')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .end(function (err, res) {
          res.should.have.status(200)
          var result = JSON.parse(res.text)
          result.records.should.be.instanceof(Array)
          result.records.should.have.length(NUMBER_PROTOCOLS)
          result.totalCount.should.equal(NUMBER_PROTOCOLS)
          done()
        })
    })

    it('should return 200 with 4 protocols on admin', function (done) {
      server
        .get('/api/network-protocols')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .end(function (err, res) {
          res.should.have.status(200)
          var result = JSON.parse(res.text)
          result.records.should.be.instanceof(Array)
          result.records.should.have.length(NUMBER_PROTOCOLS)
          result.totalCount.should.equal(NUMBER_PROTOCOLS)
          done()
        })
    })
    it('should return 200 with 2 protocol search LoraOS ', function (done) {
      server
        .get('/api/network-protocols?search=LoRa Server')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .end(function (err, res) {
          res.should.have.status(200)
          var result = JSON.parse(res.text)
          result.records.should.be.instanceof(Array)
          result.records.should.have.length(2)
          result.totalCount.should.equal(2)
          npId1 = result.records[0].id
          done()
        })
    })
    it('should return 200 with 1 protocol limit 1 offset 1', function (done) {
      server
        .get('/api/network-protocols?limit=1&offset=1')
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .end(function (err, res) {
          res.should.have.status(200)
          var result = JSON.parse(res.text)
          result.records.should.be.instanceof(Array)
          result.records.should.have.length(1)
          result.totalCount.should.equal(NUMBER_PROTOCOLS)
          done()
        })
    })
  })

  describe('GET /api/network-protocols/{id}', function () {
    it('should return 200 on admin', function (done) {
      server
        .get('/api/network-protocols/' + npId1)
        .set('Authorization', 'Bearer ' + adminToken)
        .set('Content-Type', 'application/json')
        .end(function (err, res) {
          res.should.have.status(200)
          done()
        })
    })
  })
})

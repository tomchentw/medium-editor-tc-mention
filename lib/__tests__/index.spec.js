"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _expect = require("expect");

var _expect2 = _interopRequireDefault(_expect);

var _mochaJsdom = require("mocha-jsdom");

var _mochaJsdom2 = _interopRequireDefault(_mochaJsdom);

describe("index", function () {
  (0, _mochaJsdom2["default"])();

  it("should be exported", function () {
    var Module = require("../index");

    (0, _expect2["default"])(Module["default"]).toExist();
    (0, _expect2["default"])(Module.TCMention).toExist();
  });
});
"use strict";

var _expect = require("expect");

var _expect2 = _interopRequireDefault(_expect);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("index", function describeIndex() {
  it("should be exported", function it() {
    var Module = require("../index");

    (0, _expect2.default)(Module.default).toExist();
    (0, _expect2.default)(Module.TCMention).toExist();
  });
}); /* eslint-disable prefer-arrow-callback */
import {
  default as expect,
} from "expect";

import {
  default as jsdom,
} from "mocha-jsdom";

describe("index", () => {
  jsdom();

  it("should be exported", () => {
    const Module = require("../index");

    expect(Module.default).toExist();
    expect(Module.TCMention).toExist();
  });
});

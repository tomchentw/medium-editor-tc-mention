/* eslint-disable prefer-arrow-callback */

import {
  default as expect,
} from "expect";

describe(`index`, function describeIndex() {
  it(`should be exported`, function it() {
    const Module = require(`../index`);

    expect(Module.default).toExist();
    expect(Module.TCMention).toExist();
  });
});

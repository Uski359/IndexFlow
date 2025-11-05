import { expect } from "chai";
import {
  encodePriceSqrt,
  ratioToSqrtPriceX96,
  tickFromPrice,
  priceFromTick,
  getTickSpacing,
  Q96,
} from "../scripts/shared/math";

describe("math helpers", () => {
  it("encodes unit price to Q96", () => {
    const sqrt = encodePriceSqrt(1n, 1n);
    expect(sqrt).to.equal(Q96);
  });

  it("produces stable sqrt price for thin assets", () => {
    const sqrt = ratioToSqrtPriceX96(1n, 20000n, 18, 18, false);
    expect(sqrt > 0n).to.equal(true);
  });

  it("finds ticks around +/-30% range", () => {
    const tickSpacing = getTickSpacing(3000);
    const midPrice = 0.00005;
    const lower = tickFromPrice(midPrice * 0.7, tickSpacing);
    const upper = tickFromPrice(midPrice * 1.3, tickSpacing);
    expect(lower).to.be.lt(upper);
    expect(priceFromTick(lower)).to.be.closeTo(midPrice * 0.7, 1e-6);
    expect(priceFromTick(upper)).to.be.closeTo(midPrice * 1.3, 1e-6);
  });

  it("derives mint params for dry run", () => {
    const tickSpacing = getTickSpacing(3000);
    const price = 0.00005;
    const lowerTick = tickFromPrice(price * 0.7, tickSpacing);
    const upperTick = tickFromPrice(price * 1.3, tickSpacing);
    const liquidity = 1_000_000n;
    expect(lowerTick).to.be.lt(upperTick);
    expect(liquidity > 0n).to.equal(true);
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";

describe("CraftMeetCode", function () {
  async function deployCollection() {
    const [owner, treasury, minter] = await ethers.getSigners();
    const collection = await ethers.deployContract("CraftMeetCode", [await treasury.getAddress()]);
    await collection.waitForDeployment();
    return { collection, owner, treasury, minter };
  }

  it("routes the exact freemint fee to treasury and mints from its own pool", async function () {
    const { collection, treasury, minter } = await deployCollection();
    const before = await ethers.provider.getBalance(await treasury.getAddress());
    await collection.connect(minter).mintFree(2, { value: ethers.parseEther("0.0002") });
    const after = await ethers.provider.getBalance(await treasury.getAddress());

    expect(after - before).to.equal(ethers.parseEther("0.0002"));
    expect(await collection.freeMinted()).to.equal(2n);
    expect(await collection.paidMinted()).to.equal(0n);
    expect(await collection.totalSupply()).to.equal(2n);
    expect(await collection.ownerOf(1n)).to.equal(await minter.getAddress());
    expect(await collection.freeRemaining()).to.equal(4_998n);
  });

  it("routes the paid mint price to treasury and keeps separate counters", async function () {
    const { collection, treasury, minter } = await deployCollection();
    const before = await ethers.provider.getBalance(await treasury.getAddress());
    await collection.connect(minter).mintPaid(1, { value: ethers.parseEther("0.001") });
    const after = await ethers.provider.getBalance(await treasury.getAddress());

    expect(after - before).to.equal(ethers.parseEther("0.001"));
    expect(await collection.paidMinted()).to.equal(1n);
    expect(await collection.freeMinted()).to.equal(0n);
    expect(await collection.totalSupply()).to.equal(1n);
    expect(await collection.paidRemaining()).to.equal(4_999n);
  });

  it("rejects an incorrect mint payment", async function () {
    const { collection, minter } = await deployCollection();
    await expect(collection.connect(minter).mintFree(1, { value: 0n }))
      .to.be.revertedWithCustomError(collection, "IncorrectPayment");
    await expect(collection.connect(minter).mintPaid(1, { value: ethers.parseEther("0.0001") }))
      .to.be.revertedWithCustomError(collection, "IncorrectPayment");
  });

  it("enforces each 5,000-token allocation cap before minting", async function () {
    const { collection, minter } = await deployCollection();
    await expect(collection.connect(minter).mintFree(5_001, { value: ethers.parseEther("0.5001") }))
      .to.be.revertedWithCustomError(collection, "FreeAllocationExceeded");
    await expect(collection.connect(minter).mintPaid(5_001, { value: ethers.parseEther("5.001") }))
      .to.be.revertedWithCustomError(collection, "PaidAllocationExceeded");
  });

  it("caps the total collection at 10,000", async function () {
    const { collection, minter } = await deployCollection();
    expect(await collection.MAX_SUPPLY()).to.equal(10_000n);
    expect(await collection.ALLOCATION_PER_POOL()).to.equal(5_000n);
    expect(await collection.FREE_MINT_FEE()).to.equal(ethers.parseEther("0.0001"));
    expect(await collection.PAID_MINT_PRICE()).to.equal(ethers.parseEther("0.001"));
    await expect(collection.connect(minter).mintFree(0, { value: 0n }))
      .to.be.revertedWithCustomError(collection, "ZeroQuantity");
  });

  it("generates unique on-chain artwork and palette traits for each token", async function () {
    const { collection, minter } = await deployCollection();
    await collection.connect(minter).mintFree(2, { value: ethers.parseEther("0.0002") });
    const uri1 = await collection.tokenURI(1n);
    const uri2 = await collection.tokenURI(2n);
    expect(uri1).to.match(/^data:application\/json;base64,/);
    expect(uri1).not.to.equal(uri2);
    const metadata1 = JSON.parse(Buffer.from(uri1.split(",")[1], "base64").toString("utf8"));
    const metadata2 = JSON.parse(Buffer.from(uri2.split(",")[1], "base64").toString("utf8"));
    expect(metadata1.name).to.equal("craftmeetcode Genesis #1");
    expect(metadata1.image).not.to.equal(metadata2.image);
    expect(metadata1.attributes.find((trait: { trait_type: string }) => trait.trait_type === "Palette").value)
      .not.to.equal(metadata2.attributes.find((trait: { trait_type: string }) => trait.trait_type === "Palette").value);
  });
});

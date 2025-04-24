const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonCardNFT & PokemonCardMarket", function () {
  let nft, market;
  let owner, addr1, addr2, addrs;
  const oneEther = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const PokemonCardNFT = await ethers.getContractFactory("PokemonCardNFT");
    nft = await PokemonCardNFT.deploy();
    await nft.waitForDeployment();

    const PokemonCardMarket = await ethers.getContractFactory(
      "PokemonCardMarket"
    );
    market = await PokemonCardMarket.deploy(nft.target);
    await market.waitForDeployment();
  });

  describe("PokemonCardNFT", function () {
    it("should mint an NFT and set tokenURI correctly", async function () {
      const uri = "https://example.com/meta/1.json";
      await expect(nft.connect(owner).mint(owner.address, uri)).to.emit(
        nft,
        "Transfer"
      );
      expect(await nft.tokenURI(0)).to.equal(uri);
    });

    it("should revert if non-owner tries to mint", async function () {
      await expect(
        nft.connect(addr1).mint(addr1.address, "uri")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fixed-Price Sales", function () {
    beforeEach(async function () {
      await nft.connect(owner).mint(owner.address, "uri");
      await nft.connect(owner).approve(market.target, 0);
    });

    it("lists and sells NFT correctly", async function () {
      await expect(
        market.connect(owner).listItem(0, oneEther, false, 0)
      ).to.emit(market, "Listed");
      await expect(
        market.connect(addr1).buyItem(0, { value: oneEther })
      ).to.emit(market, "Sale");
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
    });

    it("reverts on insufficient payment", async function () {
      await market.connect(owner).listItem(0, oneEther, false, 0);
      await expect(
        market.connect(addr1).buyItem(0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Insufficient funds");
    });
  });

  describe("Auctions: Commit-Reveal", function () {
    const startBid = ethers.parseEther("0.5");
    const duration = 60;
    let salt1, salt2, commit1, commit2, bid1, bid2;

    beforeEach(async function () {
      await nft.connect(owner).mint(owner.address, "uri");
      await nft.connect(owner).approve(market.target, 0);
      await market.connect(owner).listItem(0, startBid, true, duration);

      bid1 = ethers.parseEther("1.0");
      bid2 = ethers.parseEther("2.0");
      salt1 = "s1";
      salt2 = "s2";
      commit1 = ethers.solidityPackedKeccak256(
        ["uint256", "string"],
        [bid1, salt1]
      );
      commit2 = ethers.solidityPackedKeccak256(
        ["uint256", "string"],
        [bid2, salt2]
      );
    });

    it("reverts commit after auction ends", async function () {
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      await expect(
        market.connect(addr1).commitBid(0, commit1)
      ).to.be.revertedWith("Auction ended");
    });

    it("reverts reveal before end", async function () {
      await market.connect(addr1).commitBid(0, commit1);
      await expect(
        market.connect(addr1).revealBid(0, bid1, salt1, { value: bid1 })
      ).to.be.revertedWith("Auction still active");
    });

    it("reverts invalid reveal", async function () {
      // commit before auction ends
      const bad = ethers.solidityPackedKeccak256(
        ["uint256", "string"],
        [bid1, "wrong"]
      );
      await market.connect(addr1).commitBid(0, bad);
      // fast-forward past auction end
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        market.connect(addr1).revealBid(0, bid1, salt1, { value: bid1 })
      ).to.be.revertedWith("Invalid bid reveal");
    });

    it("accepts valid reveal and enforces starting bid", async function () {
      // commit valid bid
      await market.connect(addr1).commitBid(0, commit1);
      // advance time to reveal phase
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine", []);
      // reveal below starting bid should fail
      const below = ethers.parseEther("0.4");
      await expect(
        market.connect(addr1).revealBid(0, below, salt1, { value: below })
      ).to.be.revertedWith("Bid below starting bid");
      // reveal valid bid should succeed
      await expect(
        market.connect(addr1).revealBid(0, bid1, salt1, { value: bid1 })
      ).to.emit(market, "BidRevealed");
    });

    it("tracks highest bid and refunds loser", async function () {
      await market.connect(addr1).commitBid(0, commit1);
      await market.connect(addr2).commitBid(0, commit2);
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      await market.connect(addr1).revealBid(0, bid1, salt1, { value: bid1 });
      await market.connect(addr2).revealBid(0, bid2, salt2, { value: bid2 });
      const listing = await market.listings(nft.target, 0);
      expect(listing.highestBid).to.equal(bid2);
      const refund = await market.pendingWithdrawals(addr1.address);
      expect(refund).to.equal(bid1);
    });

    it("finalizes auction and transfers NFT and funds", async function () {
      await market.connect(addr1).commitBid(0, commit1);
      await market.connect(addr2).commitBid(0, commit2);
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      await market.connect(addr1).revealBid(0, bid1, salt1, { value: bid1 });
      await market.connect(addr2).revealBid(0, bid2, salt2, { value: bid2 });
      await expect(market.connect(owner).endAuction(0)).to.emit(
        market,
        "AuctionEnded"
      );
      expect(await nft.ownerOf(0)).to.equal(addr2.address);
      const pendingOwner = await market.pendingWithdrawals(owner.address);
      expect(pendingOwner).to.equal(bid2);
      await expect(market.connect(owner).withdraw()).to.emit(
        market,
        "Withdrawal"
      );
      expect(await market.pendingWithdrawals(owner.address)).to.equal(0);
    });

    it("returns NFT to seller if no bids", async function () {
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      await expect(market.connect(owner).endAuction(0)).to.emit(
        market,
        "AuctionEnded"
      );
      expect(await nft.ownerOf(0)).to.equal(owner.address);
    });

    it("only seller can finalize auction", async function () {
      await market.connect(addr1).commitBid(0, commit1);
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      await expect(market.connect(addr1).endAuction(0)).to.be.revertedWith(
        "Only seller can end auction"
      );
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await nft.connect(owner).mint(owner.address, "uri");
      await nft.connect(owner).approve(market.target, 0);
      await market.connect(owner).listItem(0, oneEther, false, 0);
      await market.connect(addr1).buyItem(0, { value: oneEther });
    });

    it("allows seller withdrawal and zeroes out balance", async function () {
      const pending = await market.pendingWithdrawals(owner.address);
      expect(pending).to.equal(oneEther);
      await expect(market.connect(owner).withdraw()).to.emit(
        market,
        "Withdrawal"
      );
      expect(await market.pendingWithdrawals(owner.address)).to.equal(0);
    });

    it("prevents withdrawing when nothing pending", async function () {
      await market.connect(owner).withdraw();
      await expect(market.connect(owner).withdraw()).to.be.revertedWith(
        "Nothing to withdraw"
      );
    });
  });
});

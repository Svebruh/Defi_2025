const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonCardNFT & PokemonCardMarket", function () {
  let nft, market;
  let owner, addr1, addr2, addrs;
  const oneEther = ethers.parseEther("1.0");

  beforeEach(async function () {
    // Get signers.
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the NFT contract
    const PokemonCardNFT = await ethers.getContractFactory("PokemonCardNFT");
    nft = await PokemonCardNFT.deploy();
    await nft.waitForDeployment();

    // Deploy the Marketplace contract with the NFT contract's address.
    const PokemonCardMarket = await ethers.getContractFactory(
      "PokemonCardMarket"
    );
    market = await PokemonCardMarket.deploy(nft.target);
    await market.waitForDeployment();
  });

  describe("PokemonCardNFT", function () {
    it("should mint an NFT and set tokenURI correctly", async function () {
      const tokenURI = "https://example.com/metadata/1.json";
      await expect(nft.connect(owner).mint(owner.address, tokenURI)).to.emit(
        nft,
        "Transfer"
      ); // Minting emits Transfer from the zero address.
      expect(await nft.tokenURI(0)).to.equal(tokenURI);
    });

    it("should revert minting if called by non-owner", async function () {
      await expect(
        nft
          .connect(addr1)
          .mint(addr1.address, "https://example.com/metadata/2.json")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should correctly enumerate minted tokens", async function () {
      await nft
        .connect(owner)
        .mint(owner.address, "https://example.com/metadata/1.json");
      await nft
        .connect(owner)
        .mint(owner.address, "https://example.com/metadata/2.json");
      expect(await nft.balanceOf(owner.address)).to.equal(2);
      // tokenOfOwnerByIndex should work as expected.
      expect(
        (await nft.tokenOfOwnerByIndex(owner.address, 0)).toString()
      ).to.equal("0");
      expect(
        (await nft.tokenOfOwnerByIndex(owner.address, 1)).toString()
      ).to.equal("1");
    });
  });

  describe("Marketplace Fixed-Price Sales", function () {
    beforeEach(async function () {
      // Mint an NFT and approve the marketplace.
      await nft
        .connect(owner)
        .mint(owner.address, "https://example.com/metadata/fixed.json");
      await nft.connect(owner).approve(market.target, 0);
    });

    it("should list an NFT for fixed-price sale", async function () {
      await expect(
        market.connect(owner).listItem(0, oneEther, false, 0)
      ).to.emit(market, "Listed");
    });

    it("should allow a buyer to purchase a fixed-price NFT", async function () {
      await nft
        .connect(owner)
        .mint(owner.address, "https://example.com/metadata/fixed.json");
      await nft.connect(owner).approve(market.target, 0);
      await market.connect(owner).listItem(0, oneEther, false, 0);

      // addr1 buys the NFT.
      await expect(
        market.connect(addr1).buyItem(0, { value: oneEther })
      ).to.emit(market, "Sale");

      // Check that addr1 is now the owner of token 0.
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
    });
  });

  describe("Marketplace Auctions", function () {
    beforeEach(async function () {
      // Mint an NFT and approve the marketplace for auction.
      await nft
        .connect(owner)
        .mint(owner.address, "https://example.com/metadata/auction.json");
      await nft.connect(owner).approve(market.target, 0);
    });

    it("should list an NFT for auction", async function () {
      const startingBid = ethers.parseEther("0.5");
      const auctionDuration = 60; // seconds
      await expect(
        market.connect(owner).listItem(0, startingBid, true, auctionDuration)
      ).to.emit(market, "Listed");
    });

    it("should allow bidding on an auction", async function () {
      const startingBid = ethers.parseEther("0.5");
      const auctionDuration = 60;
      await market
        .connect(owner)
        .listItem(0, startingBid, true, auctionDuration);

      // addr1 places a bid.
      const bidAmount = ethers.parseEther("1.0");
      await expect(market.connect(addr1).bid(0, { value: bidAmount })).to.emit(
        market,
        "Bid"
      );

      // Check the highest bid in the auction.
      const listing = await market.listings(nft.target, 0);
      expect(listing.highestBid).to.equal(bidAmount);
    });

    it("should finalize auction with bids (transfer NFT to highest bidder)", async function () {
      const startingBid = ethers.parseEther("0.5");
      const auctionDuration = 60; // Increased from 1 second to 60 seconds
      await market
        .connect(owner)
        .listItem(0, startingBid, true, auctionDuration);

      // addr1 places a bid while the auction is still active.
      const bidAmount = ethers.parseEther("1.0");
      await expect(market.connect(addr1).bid(0, { value: bidAmount })).to.emit(
        market,
        "Bid"
      );

      // Increase time to pass auction end.
      await ethers.provider.send("evm_increaseTime", [auctionDuration + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(market.connect(owner).endAuction(0)).to.emit(
        market,
        "AuctionEnded"
      );

      // NFT should be transferred to highest bidder.
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
    });

    it("should finalize auction with bids (transfer NFT to highest bidder)", async function () {
      const startingBid = ethers.parseEther("0.5");
      const auctionDuration = 60;
      await market
        .connect(owner)
        .listItem(0, startingBid, true, auctionDuration);

      // Place bid immediately while auction is still active
      const bidAmount = ethers.parseEther("1.0");
      await expect(market.connect(addr1).bid(0, { value: bidAmount })).to.emit(
        market,
        "Bid"
      );

      // Increase blockchain time to exceed the auction end time
      await ethers.provider.send("evm_increaseTime", [auctionDuration + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(market.connect(owner).endAuction(0)).to.emit(
        market,
        "AuctionEnded"
      );

      // NFT should be transferred to highest bidder.
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
    });
  });

  describe("Withdrawal of Funds", function () {
    beforeEach(async function () {
      // List an NFT for fixed-price sale and have addr1 buy it.
      await nft
        .connect(owner)
        .mint(owner.address, "https://example.com/metadata/withdraw.json");
      await nft.connect(owner).approve(market.target, 0);
      await market.connect(owner).listItem(0, oneEther, false, 0);
      await market.connect(addr1).buyItem(0, { value: oneEther });
    });

    it("should allow the seller to withdraw funds", async function () {
      // Check that pending withdrawals are recorded.
      const pending = await market.pendingWithdrawals(owner.address);
      expect(pending).to.equal(oneEther);

      // Withdraw funds.
      await expect(market.connect(owner).withdraw()).to.emit(
        market,
        "Withdrawal"
      );

      // Confirm pending withdrawals are zero after withdrawal.
      const pendingAfter = await market.pendingWithdrawals(owner.address);
      expect(pendingAfter).to.equal(0);
    });
  });
});

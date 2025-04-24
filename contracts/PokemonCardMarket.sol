// contracts/PokemonCardMarket.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonCardMarket is ReentrancyGuard, Pausable, Ownable {
    struct Listing {
        address seller;
        uint256 price;
        bool isAuction;
        bool active;
        uint256 auctionEnd;
        uint256 highestBid;
        address highestBidder;
        mapping(address => bytes32) bidCommits;
        mapping(address => uint256) revealedBids;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => uint256) public pendingWithdrawals;

    event Listed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        bool isAuction,
        uint256 auctionEnd
    );
    event Sale(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event BidCommitted(
        address indexed bidder,
        address indexed nftAddress,
        uint256 indexed tokenId
    );
    event BidRevealed(
        address indexed bidder,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 bid
    );
    event AuctionEnded(
        address indexed winner,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 finalPrice
    );
    event Withdrawal(address indexed seller, uint256 amount);

    IERC721 public nftContract;

    constructor(address _nftContract) {
        nftContract = IERC721(_nftContract);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function listItem(
        uint256 tokenId,
        uint256 price,
        bool isAuction,
        uint256 auctionDuration
    ) external whenNotPaused {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        Listing storage listing = listings[address(nftContract)][tokenId];
        listing.seller = msg.sender;
        listing.price = price;
        listing.isAuction = isAuction;
        listing.active = true;

        if (isAuction) {
            listing.auctionEnd = block.timestamp + auctionDuration;
            listing.highestBid = 0;
            listing.highestBidder = address(0);
        }

        emit Listed(
            msg.sender,
            address(nftContract),
            tokenId,
            price,
            isAuction,
            listing.auctionEnd
        );
    }

    function buyItem(
        uint256 tokenId
    ) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(!listing.isAuction, "Item is auctioned");
        require(msg.value >= listing.price, "Insufficient funds");
        listing.active = false;
        pendingWithdrawals[listing.seller] += msg.value;
        nftContract.transferFrom(address(this), msg.sender, tokenId);
        emit Sale(msg.sender, address(nftContract), tokenId, listing.price);
    }

    function commitBid(
        uint256 tokenId,
        bytes32 bidCommit
    ) external whenNotPaused {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp < listing.auctionEnd, "Auction ended");
        listing.bidCommits[msg.sender] = bidCommit;
        emit BidCommitted(msg.sender, address(nftContract), tokenId);
    }

    function revealBid(
        uint256 tokenId,
        uint256 bidAmount,
        string calldata salt
    ) external payable whenNotPaused {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp >= listing.auctionEnd, "Auction still active");
        require(msg.value == bidAmount, "Must deposit bid amount");
        require(bidAmount >= listing.price, "Bid below starting bid");

        bytes32 computed = keccak256(abi.encodePacked(bidAmount, salt));
        require(
            computed == listing.bidCommits[msg.sender],
            "Invalid bid reveal"
        );
        listing.revealedBids[msg.sender] = bidAmount;
        emit BidRevealed(msg.sender, address(nftContract), tokenId, bidAmount);

        if (bidAmount > listing.highestBid) {
            // Refund previous highest bidder
            if (listing.highestBidder != address(0)) {
                pendingWithdrawals[listing.highestBidder] += listing.highestBid;
            }
            listing.highestBid = bidAmount;
            listing.highestBidder = msg.sender;
        }
    }

    function endAuction(uint256 tokenId) external nonReentrant whenNotPaused {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(msg.sender == listing.seller, "Only seller can end auction");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp >= listing.auctionEnd, "Auction not ended");

        listing.active = false;

        if (listing.highestBid > 0) {
            pendingWithdrawals[listing.seller] += listing.highestBid;
            nftContract.transferFrom(
                address(this),
                listing.highestBidder,
                tokenId
            );
            emit AuctionEnded(
                listing.highestBidder,
                address(nftContract),
                tokenId,
                listing.highestBid
            );
        } else {
            nftContract.transferFrom(address(this), listing.seller, tokenId);
            emit AuctionEnded(address(0), address(nftContract), tokenId, 0);
        }
    }

    function withdraw() external nonReentrant whenNotPaused {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit Withdrawal(msg.sender, amount);
    }
}

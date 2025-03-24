// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract PokemonCardMarket is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price; // Price in wei (for fixed-price sale)
        bool isAuction;
        bool active;
        // Auction-specific fields
        uint256 highestBid;
        address highestBidder;
        uint256 auctionEnd;
    }

    // Using the NFT contract’s address as a key for listings mapping
    mapping(address => mapping(uint256 => Listing)) public listings;

    // The NFT contract (Pokémon Card)
    IERC721 public nftContract;

    // Mapping for sellers’ funds (withdrawal pattern)
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
    event Bid(
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

    /**
     * @notice Initializes the marketplace with the deployed NFT contract address.
     * @param _nftContract The address of the deployed PokemonCardNFT contract.
     */
    constructor(address _nftContract) {
        nftContract = IERC721(_nftContract);
    }

    /**
     * @notice List an NFT for sale or auction.
     * @param tokenId The token ID of the NFT to list.
     * @param price The sale price (for fixed-price) or minimum bid (for auction) in wei.
     * @param isAuction A boolean indicating whether this listing is an auction.
     * @param auctionDuration Duration (in seconds) for which the auction will be active (ignored for fixed-price).
     */
    function listItem(
        uint256 tokenId,
        uint256 price,
        bool isAuction,
        uint256 auctionDuration
    ) external {
        // Verify that the caller owns the token
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        // Transfer the NFT to the marketplace contract for escrow purposes
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        Listing memory listing;
        listing.seller = msg.sender;
        listing.price = price;
        listing.isAuction = isAuction;
        listing.active = true;
        if (isAuction) {
            listing.auctionEnd = block.timestamp + auctionDuration;
        }
        listings[address(nftContract)][tokenId] = listing;

        emit Listed(
            msg.sender,
            address(nftContract),
            tokenId,
            price,
            isAuction,
            listing.auctionEnd
        );
    }

    /**
     * @notice Purchase an NFT listed for fixed-price sale.
     * @param tokenId The token ID of the NFT to buy.
     */
    function buyItem(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(!listing.isAuction, "Item is auctioned");
        require(msg.value >= listing.price, "Insufficient funds");

        listing.active = false;
        // Add funds to seller’s withdrawal balance
        pendingWithdrawals[listing.seller] += msg.value;
        // Transfer NFT to buyer
        nftContract.transferFrom(address(this), msg.sender, tokenId);

        emit Sale(msg.sender, address(nftContract), tokenId, listing.price);
    }

    /**
     * @notice Place a bid on an NFT that is up for auction.
     * @param tokenId The token ID of the NFT being auctioned.
     */
    function bid(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(listing.isAuction, "Item is not auctioned");
        require(block.timestamp < listing.auctionEnd, "Auction ended");
        require(msg.value > listing.highestBid, "Bid too low");

        // Refund previous highest bidder if applicable
        if (listing.highestBid != 0) {
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }
        listing.highestBid = msg.value;
        listing.highestBidder = msg.sender;

        emit Bid(msg.sender, address(nftContract), tokenId, msg.value);
    }

    /**
     * @notice End an auction once the auction duration has elapsed.
     * Transfers the NFT to the highest bidder (if any) or returns it to the seller.
     * @param tokenId The token ID of the NFT for which the auction is ending.
     */
    function endAuction(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[address(nftContract)][tokenId];
        require(listing.active, "Item not active");
        require(listing.isAuction, "Item is not auctioned");
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
            // No bids: return NFT to seller
            nftContract.transferFrom(address(this), listing.seller, tokenId);
            emit AuctionEnded(listing.seller, address(nftContract), tokenId, 0);
        }
    }

    /**
     * @notice Withdraw accumulated funds (from sales or refunded bids).
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit Withdrawal(msg.sender, amount);
    }
}

// src/Marketplace.js
import React, { useState, useEffect } from "react";
import { ethers, parseEther } from "ethers";

function ListingItem({ listing, marketContract, refreshListings }) {
  const [bidValue, setBidValue] = useState("");
  const [status, setStatus] = useState("");

  // Function to handle buying a fixed-price listing
  const handleBuy = async () => {
    try {
      setStatus("Processing purchase...");
      const tx = await marketContract.buyItem(listing.tokenId, {
        value: ethers.parseEther(listing.price),
      });
      await tx.wait();
      setStatus("Purchase successful!");
      refreshListings();
    } catch (error) {
      console.error("Error buying item:", error);
      setStatus("Purchase failed.");
    }
  };

  // Function to handle bidding for an auction listing
  const handleBid = async () => {
    try {
      setStatus("Placing bid...");
      const tx = await marketContract.bid(listing.tokenId, {
        value: ethers.parseEther(bidValue),
      });
      await tx.wait();
      setStatus("Bid placed successfully!");
      refreshListings();
    } catch (error) {
      console.error("Error placing bid:", error);
      setStatus("Bid failed.");
    }
  };

  return (
    <li style={{ marginBottom: "20px", border: "1px solid #ccc", padding: "10px" }}>
      <p>
        <strong>Token ID:</strong> {listing.tokenId}
      </p>
      <p>
        <strong>Seller:</strong> {listing.seller}
      </p>
      <p>
        <strong>Price:</strong> {listing.price} ETH
      </p>
      {listing.isAuction ? (
        <>
          <p>
            <strong>Auction Ends:</strong> {listing.auctionEnd}
          </p>
          <div>
            <input
              type="text"
              placeholder="Bid amount (ETH)"
              value={bidValue}
              onChange={(e) => setBidValue(e.target.value)}
            />
            <button onClick={handleBid}>Place Bid</button>
          </div>
        </>
      ) : (
        <button onClick={handleBuy}>Buy NFT</button>
      )}
      {status && <p>Status: {status}</p>}
    </li>
  );
}

function Marketplace({ marketContract, nftContract }) {
  const [listings, setListings] = useState([]);

  const fetchListings = async () => {
    if (!marketContract) return;
    try {
      // Query both Listed and Sale events
      const listedEvents = await marketContract.queryFilter("Listed");
      const saleEvents = await marketContract.queryFilter("Sale");

      // Combine events with a type tag
      let allEvents = [];
      listedEvents.forEach((event) => {
        allEvents.push({ type: "Listed", event });
      });
      saleEvents.forEach((event) => {
        allEvents.push({ type: "Sale", event });
      });

      // Sort events by blockNumber in ascending order
      allEvents.sort((a, b) => a.event.blockNumber - b.event.blockNumber);

      // Build a mapping of tokenId -> latest event data
      const latestState = {};
      allEvents.forEach((item) => {
        const tokenId = item.event.args.tokenId.toString();
        latestState[tokenId] = item; // later events overwrite earlier ones
      });

      // Filter only tokens whose latest event is "Listed"
      const activeListings = Object.values(latestState)
        .filter((item) => item.type === "Listed")
        .map((item) => ({
          seller: item.event.args.seller,
          nftAddress: item.event.args.nftAddress,
          tokenId: item.event.args.tokenId.toString(),
          price: ethers.formatEther(item.event.args.price),
          isAuction: item.event.args.isAuction,
          auctionEnd: item.event.args.auctionEnd.toString(),
        }));

      setListings(activeListings);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
    }
  };

  useEffect(() => {
    if (marketContract) {
      fetchListings();

      // Listen for both Listed and Sale events
      const handleNewEvent = () => {
        fetchListings();
      };

      marketContract.on("Listed", handleNewEvent);
      marketContract.on("Sale", handleNewEvent);

      return () => {
        marketContract.removeListener("Listed", handleNewEvent);
        marketContract.removeListener("Sale", handleNewEvent);
      };
    }
  }, [marketContract]);

  return (
    <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc" }}>
      <h2>Marketplace Listings</h2>
      {listings.length === 0 ? (
        <p>No listings available.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {listings.map((listing, index) => (
            <ListingItem
              key={index}
              listing={listing}
              marketContract={marketContract}
              refreshListings={fetchListings}
            />
          ))}
        </ul>
      )}
      <button onClick={fetchListings}>Refresh Listings</button>
    </div>
  );
}

export default Marketplace;

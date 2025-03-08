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
      // Call buyItem with the tokenId and send the fixed price as value
      const tx = await marketContract.buyItem(listing.tokenId, {
        value: parseEther(listing.price),
      });
      await tx.wait();
      setStatus("Purchase successful!");
      refreshListings(); // Optionally refresh the listings
    } catch (error) {
      console.error("Error buying item:", error);
      setStatus("Purchase failed.");
    }
  };

  // Function to handle bidding for an auction listing
  const handleBid = async () => {
    try {
      setStatus("Placing bid...");
      // Call bid with the tokenId and send the bid amount as value
      const tx = await marketContract.bid(listing.tokenId, {
        value: parseEther(bidValue),
      });
      await tx.wait();
      setStatus("Bid placed successfully!");
      refreshListings(); // Optionally refresh the listings
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

  // Fetch past "Listed" events from the marketplace
  const fetchListings = async () => {
    if (!marketContract) return;
    try {
      const events = await marketContract.queryFilter("Listed");
      // Map each event to a listing object and format values (price in ETH)
      const formattedListings = events.map((event) => ({
        seller: event.args.seller,
        nftAddress: event.args.nftAddress,
        tokenId: event.args.tokenId.toString(),
        price: ethers.formatEther(event.args.price),
        isAuction: event.args.isAuction,
        auctionEnd: event.args.auctionEnd.toString(),
      }));
      setListings(formattedListings);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
    }
  };

  useEffect(() => {
    if (marketContract) {
      fetchListings();
      // Listen for new "Listed" events to update the UI in real time.
      marketContract.on(
        "Listed",
        (seller, nftAddress, tokenId, price, isAuction, auctionEnd) => {
          const newListing = {
            seller,
            nftAddress,
            tokenId: tokenId.toString(),
            price: ethers.formatEther(price),
            isAuction,
            auctionEnd: auctionEnd.toString(),
          };
          setListings((prev) => [...prev, newListing]);
        }
      );
      return () => {
        marketContract.removeAllListeners("Listed");
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

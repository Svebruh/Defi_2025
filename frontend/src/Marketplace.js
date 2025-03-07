// src/Marketplace.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

function Marketplace({ marketContract, nftContract }) {
  const [listings, setListings] = useState([]);

  // Function to fetch past "Listed" events
  const fetchListings = async () => {
    if (!marketContract) return;
    try {
      // Query past Listed events; adjust the filter parameters as needed
      const events = await marketContract.queryFilter("Listed");
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
      // Fetch past listings on component mount
      fetchListings();

      // Listen for new "Listed" events and update the listings state
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

      // Cleanup the event listener when component unmounts
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
        <ul>
          {listings.map((listing, index) => (
            <li key={index}>
              <p>
                <strong>Token ID:</strong> {listing.tokenId}
              </p>
              <p>
                <strong>Seller:</strong> {listing.seller}
              </p>
              <p>
                <strong>Price:</strong> {listing.price} ETH
              </p>
              {listing.isAuction && (
                <p>
                  <strong>Auction Ends:</strong> {listing.auctionEnd}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <button onClick={fetchListings}>Refresh Listings</button>
    </div>
  );
}

export default Marketplace;

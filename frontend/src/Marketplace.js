// src/Marketplace.js
import React, { useState, useEffect } from "react";
import { ethers, parseEther } from "ethers";

// Component for fixed-price listings
function FixedPriceListingItem({ listing, marketContract, refreshListings }) {
  const [status, setStatus] = useState("");

  const handleBuy = async () => {
    try {
      setStatus("Processing purchase...");
      const tx = await marketContract.buyItem(listing.tokenId, {
        value: parseEther(listing.price),
      });
      await tx.wait();
      setStatus("Purchase successful!");
      refreshListings();
    } catch (error) {
      console.error("Error buying item:", error);
      setStatus("Purchase failed.");
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
      <button onClick={handleBuy}>Buy NFT</button>
      {status && <p>Status: {status}</p>}
    </li>
  );
}

// Component for auction listings
function AuctionListingItem({ listing, marketContract, refreshListings, nftAddress }) {
  const [bidValue, setBidValue] = useState("");
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentHighestBid, setCurrentHighestBid] = useState("0");

  // Update the countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = listing.auctionEnd - now;
      setTimeLeft(diff > 0 ? diff : 0);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [listing.auctionEnd]);

  // Fetch updated auction data (highest bid) from the contract
  const fetchAuctionData = async () => {
    try {
      // listings is a public mapping: listings(nftAddress, tokenId)
      const updatedListing = await marketContract.listings(nftAddress, listing.tokenId);
      setCurrentHighestBid(ethers.formatEther(updatedListing.highestBid));
    } catch (error) {
      console.error("Error fetching auction data:", error);
    }
  };

  useEffect(() => {
    if (listing.isAuction) {
      fetchAuctionData();
    }
    // Optionally refresh when bid events occur
  }, [listing, marketContract]);

  const handleBid = async () => {
    try {
      setStatus("Placing bid...");
      const tx = await marketContract.bid(listing.tokenId, {
        value: parseEther(bidValue),
      });
      await tx.wait();
      setStatus("Bid placed successfully!");
      fetchAuctionData();
      refreshListings();
    } catch (error) {
      console.error("Error placing bid:", error);
      setStatus("Bid failed.");
    }
  };

  // Finalize the auction after it ends
  const handleEndAuction = async () => {
    try {
      setStatus("Finalizing auction...");
      const tx = await marketContract.endAuction(listing.tokenId);
      await tx.wait();
      setStatus("Auction finalized!");
      refreshListings();
    } catch (error) {
      console.error("Error ending auction:", error);
      setStatus("Ending auction failed.");
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
      {currentHighestBid === "0" ? (
        <p>
          <strong>Starting bid:</strong> {listing.price} ETH
        </p>
      ) : (
        <p>
          <strong>Current highest bid:</strong> {currentHighestBid} ETH
        </p>
      )}
      <p>
        <strong>Auction ends in:</strong>{" "}
        {timeLeft > 0 ? `${timeLeft} seconds` : "Auction ended"}
      </p>
      {timeLeft > 0 ? (
        <>
          <input
            type="text"
            placeholder="Bid amount (ETH)"
            value={bidValue}
            onChange={(e) => setBidValue(e.target.value)}
          />
          <button onClick={handleBid}>Place Bid</button>
        </>
      ) : (
        // Auction time has elapsed – show button to finalize auction
        <button onClick={handleEndAuction}>End Auction</button>
      )}
      {status && <p>Status: {status}</p>}
    </li>
  );
}

// Main Marketplace component
function Marketplace({ marketContract, nftContract, nftAddress }) {
  const [listings, setListings] = useState([]);

  const fetchListings = async () => {
    if (!marketContract) return;
    try {
      // Query Listed, Sale, and AuctionEnded events
      const listedEvents = await marketContract.queryFilter("Listed");
      const saleEvents = await marketContract.queryFilter("Sale");
      const auctionEndedEvents = await marketContract.queryFilter("AuctionEnded");
  
      // Combine all events with a type tag
      let allEvents = [];
      listedEvents.forEach((event) => {
        allEvents.push({ type: "Listed", event });
      });
      saleEvents.forEach((event) => {
        allEvents.push({ type: "Sale", event });
      });
      auctionEndedEvents.forEach((event) => {
        allEvents.push({ type: "AuctionEnded", event });
      });
  
      // Sort all events by blockNumber (ascending order)
      allEvents.sort((a, b) => a.event.blockNumber - b.event.blockNumber);
  
      // Build a mapping for each tokenId to the latest event
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
          auctionEnd: Number(item.event.args.auctionEnd), // Convert BigInt to Number
        }));
  
      setListings(activeListings);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
    }
  };
  

  useEffect(() => {
    if (marketContract) {
      fetchListings();
      const handleNewEvent = () => {
        fetchListings();
      };
      marketContract.on("Listed", handleNewEvent);
      marketContract.on("Sale", handleNewEvent);
      marketContract.on("Bid", handleNewEvent);
      return () => {
        marketContract.removeListener("Listed", handleNewEvent);
        marketContract.removeListener("Sale", handleNewEvent);
        marketContract.removeListener("Bid", handleNewEvent);
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
          {listings.map((listing, index) =>
            listing.isAuction ? (
              <AuctionListingItem
                key={index}
                listing={listing}
                marketContract={marketContract}
                refreshListings={fetchListings}
                nftAddress={nftAddress}
              />
            ) : (
              <FixedPriceListingItem
                key={index}
                listing={listing}
                marketContract={marketContract}
                refreshListings={fetchListings}
              />
            )
          )}
        </ul>
      )}
      <button onClick={fetchListings}>Refresh Listings</button>
    </div>
  );
}

export default Marketplace;

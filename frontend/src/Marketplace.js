// src/Marketplace.js
import React, { useState, useEffect } from "react";
import { ethers, parseEther } from "ethers";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
} from "@mui/material";

// Fixed-price listing subcomponent
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
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1">
          <strong>Token ID:</strong> {listing.tokenId}
        </Typography>
        <Typography variant="body2">
          <strong>Seller:</strong> {listing.seller}
        </Typography>
        <Typography variant="body2">
          <strong>Price:</strong> {listing.price} ETH
        </Typography>
        <Button variant="contained" onClick={handleBuy} sx={{ mt: 1 }}>
          Buy NFT
        </Button>
        {status && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {status}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Auction listing subcomponent
function AuctionListingItem({ listing, marketContract, refreshListings, nftAddress }) {
  const [bidValue, setBidValue] = useState("");
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentHighestBid, setCurrentHighestBid] = useState("0");

  // Update countdown timer
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

  // Fetch the latest auction data (current highest bid)
  const fetchAuctionData = async () => {
    try {
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
    <Box>
      <Typography variant="body2">
        <strong>Seller:</strong> {listing.seller}
      </Typography>
      {currentHighestBid === "0" ? (
        <Typography variant="body2">
          <strong>Starting bid:</strong> {listing.price} ETH
        </Typography>
      ) : (
        <Typography variant="body2">
          <strong>Current highest bid:</strong> {currentHighestBid} ETH
        </Typography>
      )}
      <Typography variant="body2">
        <strong>Auction ends in:</strong>{" "}
        {timeLeft > 0 ? `${timeLeft} seconds` : "Auction ended"}
      </Typography>
      {timeLeft > 0 ? (
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            label="Bid amount (ETH)"
            size="small"
            value={bidValue}
            onChange={(e) => setBidValue(e.target.value)}
          />
          <Button variant="contained" onClick={handleBid}>
            Place Bid
          </Button>
        </Box>
      ) : (
        <Button variant="contained" onClick={handleEndAuction} sx={{ mt: 1 }}>
          End Auction
        </Button>
      )}
      {status && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {status}
        </Typography>
      )} 
    </Box>


  );
}

// Main Marketplace component
function Marketplace({ marketContract, nftContract, nftAddress }) {
  const [listings, setListings] = useState([]);

  const fetchListings = async () => {
    if (!marketContract) return;
    try {
      // Query events for listings, sales, and auction finalizations
      const listedEvents = await marketContract.queryFilter("Listed");
      const saleEvents = await marketContract.queryFilter("Sale");
      const auctionEndedEvents = await marketContract.queryFilter("AuctionEnded");

      // Combine events with a type tag
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

      // Sort events by blockNumber (oldest first)
      allEvents.sort((a, b) => a.event.blockNumber - b.event.blockNumber);

      // Determine latest state for each tokenId
      const latestState = {};
      allEvents.forEach((item) => {
        const tokenId = item.event.args.tokenId.toString();
        latestState[tokenId] = item;
      });

      // Filter active listings (only where the latest event is "Listed")
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
      const handleNewEvent = () => fetchListings();
      marketContract.on("Listed", handleNewEvent);
      marketContract.on("Sale", handleNewEvent);
      marketContract.on("Bid", handleNewEvent);
      marketContract.on("AuctionEnded", handleNewEvent);
      return () => {
        marketContract.removeListener("Listed", handleNewEvent);
        marketContract.removeListener("Sale", handleNewEvent);
        marketContract.removeListener("Bid", handleNewEvent);
        marketContract.removeListener("AuctionEnded", handleNewEvent);
      };
    }
  }, [marketContract]);

  return (
    <Box>
              {listings.length === 0 ? (
          <Typography>No listings available.</Typography>
        ) : (
          <Box>
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
          </Box>
        )}
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={fetchListings}>
            Refresh Listings
          </Button>
        </Box>
    </Box>
  );
}

export default Marketplace;

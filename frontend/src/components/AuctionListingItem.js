import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import { ethers, parseEther } from "ethers";
import React, { useEffect, useState } from "react";

function AuctionListingItem({
  listing,
  marketContract,
  refreshListings,
  nftAddress,
  nftContract,
}) {
  const [bidValue, setBidValue] = useState("");
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentHighestBid, setCurrentHighestBid] = useState("0");
  const [metadata, setMetadata] = useState(null);

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

  // Fetch auction data (highest bid) from the marketplace contract
  const fetchAuctionData = async () => {
    try {
      const updatedListing = await marketContract.listings(
        nftAddress,
        listing.tokenId
      );
      setCurrentHighestBid(ethers.formatEther(updatedListing.highestBid));
    } catch (error) {
      console.error("Error fetching auction data:", error);
    }
  };

  // Fetch NFT metadata for the given tokenId using nftContract
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!nftContract || !listing.tokenId) return;
      try {
        const tokenURI = await nftContract.tokenURI(listing.tokenId);
        const response = await fetch(tokenURI);
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error("Error fetching NFT metadata:", error);
      }
    };
    fetchMetadata();
  }, [nftContract, listing.tokenId]);

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
    <Card
      sx={{
        mb: 2,
        border: "1px solid #444",
        borderRadius: 2,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Display the NFT image if available */}
          {metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.name || `Token #${listing.tokenId}`}
              style={{ width: "80px", borderRadius: "8px" }}
            />
          ) : (
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                backgroundColor: "#333",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption">No Image</Typography>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1">
              <strong>Token ID:</strong> {listing.tokenId}
            </Typography>
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
          </Box>
        </Box>

        {timeLeft > 0 ? (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
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
          <Button variant="contained" onClick={handleEndAuction} sx={{ mt: 2 }}>
            End Auction
          </Button>
        )}
        {status && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {status}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default AuctionListingItem;

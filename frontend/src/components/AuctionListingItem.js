import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import { ethers, parseEther } from "ethers";
import React, { useEffect, useState, useCallback } from "react";

function AuctionListingItem({
  listing,
  marketContract,
  refreshListings,
  nftAddress,
  nftContract,
  account,
}) {
  const [bidValue, setBidValue] = useState("");
  const [salt, setSalt] = useState("");
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentHighestBid, setCurrentHighestBid] = useState("0");
  const [metadata, setMetadata] = useState(null);

  // Fetch auction data (highest bid)
  const fetchAuctionData = useCallback(async () => {
    if (!marketContract) return;
    try {
      const updated = await marketContract.listings(
        nftAddress,
        listing.tokenId
      );
      setCurrentHighestBid(ethers.formatEther(updated.highestBid));
    } catch (err) {
      console.error("Error fetching auction data:", err);
    }
  }, [marketContract, nftAddress, listing.tokenId]);

  // Initial data load
  useEffect(() => {
    if (listing.isAuction) fetchAuctionData();
  }, [listing.isAuction, fetchAuctionData]);

  // Live update when bids are revealed
  useEffect(() => {
    const handleBidRevealed = (bidder, nftAddr, tokenId, bid) => {
      if (
        nftAddr.toLowerCase() === nftAddress.toLowerCase() &&
        tokenId.toString() === listing.tokenId
      ) {
        fetchAuctionData();
      }
    };
    if (marketContract) {
      marketContract.on("BidRevealed", handleBidRevealed);
    }
    return () => {
      if (marketContract) {
        marketContract.off("BidRevealed", handleBidRevealed);
      }
    };
  }, [marketContract, nftAddress, listing.tokenId, fetchAuctionData]);

  // Countdown timer
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

  // Fetch NFT metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!nftContract) return;
      try {
        const uri = await nftContract.tokenURI(listing.tokenId);
        const res = await fetch(uri);
        const data = await res.json();
        setMetadata(data);
      } catch (err) {
        console.error("Error fetching NFT metadata:", err);
      }
    };
    fetchMetadata();
  }, [nftContract, listing.tokenId]);

  // Commit bid: do not allow bid below starting bid
  const handleCommitBid = async () => {
    if (!bidValue || !salt) {
      setStatus("Enter bid and salt.");
      return;
    }
    try {
      const bidWei = parseEther(bidValue);
      const startingWei = parseEther(listing.price);
      if (bidWei < startingWei) {
        setStatus("Bid must be at least the starting bid.");
        return;
      }
      setStatus("Committing bid...");
      const commitHash = ethers.solidityPackedKeccak256(
        ["uint256", "string"],
        [bidWei, salt]
      );
      const tx = await marketContract.commitBid(listing.tokenId, commitHash);
      await tx.wait();
      setStatus("Bid committed. Reveal after auction ends.");
    } catch (err) {
      console.error(err);
      setStatus("Commit failed.");
    }
  };

  // Reveal bid
  const handleRevealBid = async () => {
    if (!bidValue || !salt) {
      setStatus("Enter bid and salt.");
      return;
    }
    try {
      setStatus("Revealing bid...");
      const bidWei = parseEther(bidValue);
      const tx = await marketContract.revealBid(listing.tokenId, bidWei, salt, {
        value: bidWei,
      });
      await tx.wait();
      setStatus("Bid revealed!");
      fetchAuctionData();
      refreshListings();
    } catch (err) {
      console.error(err);
      setStatus("Reveal failed.");
    }
  };

  // End auction
  const handleEndAuction = async () => {
    try {
      setStatus("Finalizing auction...");
      const tx = await marketContract.endAuction(listing.tokenId);
      await tx.wait();
      setStatus("Auction finalized!");
      refreshListings();
    } catch (err) {
      console.error(err);
      setStatus("Finalize failed.");
    }
  };

  const isSeller =
    account && account.toLowerCase() === listing.seller.toLowerCase();

  return (
    <Card
      sx={{
        mb: 2,
        border: "1px solid #444",
        borderRadius: 2,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.name}
              style={{ width: 80, borderRadius: 8 }}
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
            <Typography variant="body2">
              <strong>Starting bid:</strong> {listing.price} ETH
            </Typography>
            {parseFloat(currentHighestBid) >= parseFloat(listing.price) && (
              <Typography variant="body2">
                <strong>Current highest bid:</strong> {currentHighestBid} ETH
              </Typography>
            )}
            <Typography variant="body2">
              <strong>Ends in:</strong>{" "}
              {timeLeft > 0 ? `${timeLeft}s` : "Ended"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            label="Bid (ETH)"
            size="small"
            value={bidValue}
            onChange={(e) => setBidValue(e.target.value)}
          />
          <TextField
            label="Salt"
            size="small"
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
          />
          {timeLeft > 0 ? (
            <Button variant="contained" onClick={handleCommitBid}>
              Commit
            </Button>
          ) : (
            <>
              <Button variant="contained" onClick={handleRevealBid}>
                Reveal
              </Button>
              {isSeller && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleEndAuction}
                >
                  End Auction
                </Button>
              )}
            </>
          )}
        </Box>

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

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

// Fixed-price listing subcomponent
function FixedPriceListingItem({
  listing,
  marketContract,
  refreshListings,
  nftContract,
}) {
  const [status, setStatus] = useState("");
  const [metadata, setMetadata] = useState(null);

  // Fetch the NFT metadata for this token
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!nftContract || !listing) return;
      try {
        const tokenURI = await nftContract.tokenURI(listing.tokenId);
        const response = await fetch(tokenURI);
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error("Error loading NFT metadata:", error);
      }
    };
    fetchMetadata();
  }, [nftContract, listing]);

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
            <Typography variant="body2">
              <strong>Price:</strong> {listing.price} ETH
            </Typography>
          </Box>
        </Box>

        <Button variant="contained" onClick={handleBuy} sx={{ mt: 2 }}>
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

// Main Marketplace component
function Marketplace({ marketContract, nftContract, nftAddress }) {
  const [listings, setListings] = useState([]);

  const fetchListings = React.useCallback(async () => {
    if (!marketContract) return;
    try {
      // Query events for listings, sales, and auction finalizations
      const listedEvents = await marketContract.queryFilter("Listed");
      const saleEvents = await marketContract.queryFilter("Sale");
      const auctionEndedEvents = await marketContract.queryFilter(
        "AuctionEnded"
      );

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
  }, [marketContract]);

  useEffect(() => {
    if (marketContract) {
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
  }, [marketContract, fetchListings]);

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
                nftContract={nftContract}
              />
            ) : (
              <FixedPriceListingItem
                key={index} // why do we need a key here?
                listing={listing}
                marketContract={marketContract}
                refreshListings={fetchListings}
                nftContract={nftContract}
              />
            )
          )}
        </Box>
      )}
      <Box textAlign="center" sx={{ mt: 0 }}>
        <Button variant="contained" onClick={fetchListings}>
          Refresh Listings
        </Button>
      </Box>
    </Box>
  );
}

export default Marketplace;

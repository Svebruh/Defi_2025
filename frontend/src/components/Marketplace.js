import { Box, Button, Typography } from "@mui/material";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import AuctionListingItem from "./AuctionListingItem";
import FixedPriceListingItem from "./FixedPriceListingItem";

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
      listedEvents.forEach((event) =>
        allEvents.push({ type: "Listed", event })
      );
      saleEvents.forEach((event) => allEvents.push({ type: "Sale", event }));
      auctionEndedEvents.forEach((event) =>
        allEvents.push({ type: "AuctionEnded", event })
      );

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
          auctionEnd: Number(item.event.args.auctionEnd),
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
      marketContract.on("BidCommitted", handleNewEvent);
      marketContract.on("BidRevealed", handleNewEvent);
      marketContract.on("AuctionEnded", handleNewEvent);
      return () => {
        marketContract.removeListener("Listed", handleNewEvent);
        marketContract.removeListener("Sale", handleNewEvent);
        marketContract.removeListener("BidCommitted", handleNewEvent);
        marketContract.removeListener("BidRevealed", handleNewEvent);
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
                key={index}
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

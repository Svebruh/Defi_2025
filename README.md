# Pokémon Card Trading Platform

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Setup & Installation](#setup--installation)
6. [Running the Local Testnet & Deployment](#running-the-local-testnet--deployment)
7. [Starting the Web App](#starting-the-web-app)
8. [Testing](#testing)
9. [Architecture Overview](#architecture-overview)
   - [Smart Contracts](#smart-contracts)
   - [Frontend Application](#frontend-application)
10. [Security Features](#security-features)
11. [Metadata & Assets](#metadata--assets)
12. [AI Tools Used](#ai-tools-used)
13. [Optional Enhancements](#optional-enhancements)

---

## Overview

This decentralized application (dApp) allows users to mint, list, and trade Pokémon card NFTs on a local Ethereum testnet using Hardhat. It supports both fixed-price sales and sealed-bid auctions with a commit–reveal scheme.

## Tech Stack

- **Solidity 0.8.x** with OpenZeppelin Contracts ^4.x
- **Hardhat** for local development & testing
- **ethers.js** for on-chain interactions
- **React** + **Material UI (MUI)** for the frontend
- **Commit–Reveal** auction design
- **Local Hardhat Network** (chainId 31337)

## Prerequisites

- Node.js >= 16.x and npm/yarn
- Chrome or Firefox with MetaMask extension installed
- Git

## Project Structure

```
root/
├── contracts/              # Solidity contracts
│   ├── PokemonCardNFT.sol  # ERC721Enumerable + URIStorage + Ownable
│   └── PokemonCardMarket.sol  # Marketplace with fixed-price & commit-reveal auctions
├── scripts/                # Deployment scripts
│   └── deploy.js
├── test/                   # Hardhat tests (Mocha/Chai)
│   └── PokemonCard.test.js
├── frontend/               # React app
│   ├── src/
│   │   ├── abi/            # Compiled ABIs JSON
│   │   ├── components/     # UI components (Inventory, ListCard, Marketplace, etc.)
│   │   ├── TokenURI/       # Local metadata JSON files
│   │   └── App.js
│   ├── public/
│   └── package.json
├── hardhat.config.js       # Hardhat configuration
├── README.md
└── LICENSE
```

## Setup & Installation

1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Compile contracts**
   ```bash
   npx hardhat compile
   ```
4. **Start local Hardhat node**
   ```bash
   npx hardhat node
   ```

## Running the Local Testnet & Deployment

In a separate terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

## Starting the Web App

After deploying contracts and updating the addresses in `frontend/src/App.js`:

```bash
cd frontend
npm install
npm start
```

- Opens the React app at http://localhost:3000
- Ensure your local Hardhat node (`npx hardhat node`) is running
- If you change ports, update the `proxy` setting in `frontend/package.json` accordingly

## Testing

Run the comprehensive test suite:

```bash
npx hardhat test
```

Covers:

- **NFT contract**: minting, URI, enumeration, access control
- **Fixed-price marketplace**: listing, buying, withdrawals
- **Auctions**: listing, commit–reveal edge cases, highest-bid tracking, refunds, finalization by seller only
- **Security**: reentrancy, pausable, pull withdrawals

## Architecture Overview

### Smart Contracts

1. **PokemonCardNFT.sol**

   - Inherits `ERC721Enumerable`, `ERC721URIStorage`, `Ownable`.
   - `mint(address to, string uri) external onlyOwner` for secure minting.
   - Enumerable and URI storage extensions for inventory and metadata.

2. **PokemonCardMarket.sol**
   - Inherits `ReentrancyGuard`, `Pausable`, `Ownable`.
   - `listItem(tokenId, price, isAuction, auctionDuration)` transfers NFT to escrow, resets previous auction state, emits `Listed`.
   - **Fixed-price**: `buyItem` uses pull-withdrawal, emits `Sale`.
   - **Auctions (commit–reveal)**:
     - `commitBid(tokenId, bytes32 commit)` stores hashed deposit.
     - `revealBid(tokenId, uint256 amount, string salt)` after end, enforces `amount >= startingBid`, decodes commitment, updates `highestBid`, refunds loser.
     - `endAuction(tokenId)` only callable by seller post-end, transfers NFT & funds or returns NFT if no bids, emits `AuctionEnded`.
   - **Pull withdrawals** via `pendingWithdrawals` and `withdraw()` to avoid reentrancy.
   - **Emergency stop**: owner can `pause()`/`unpause()` all state-changing functions.

### Frontend Application

- **React** with functional components & hooks.
- **Wallet Connection**: MetaMask only, selecting `window.ethereum.providers.find(p=>p.isMetaMask)`.
- **Key Components**:
  - **MintCard** (owner only)
  - **Inventory**: displays owned NFTs via `balanceOf`, `tokenOfOwnerByIndex`, and `tokenURI`.
  - **ListCard**: fixed-price & auction modes; requires price/starting bid and optional duration.
  - **PauseControls** (owner only)
  - **Marketplace**: listens to `Listed`, `Sale`, `BidCommitted`, `BidRevealed`, `AuctionEnded` events for live updates.
  - **AuctionListingItem**: shows starting bid, live highest bid, countdown, commit/reveal inputs, and seller-only “End Auction”.
  - **WithdrawFunds**: displays and pulls pending balances.
- **Styling**: MUI dark mode palette, rounded cards, consistent layout, responsive design.

## Security Features

- **ReentrancyGuard** on ETH-sending methods.
- **Ownable** access control for mint, pause/unpause, auction finalization.
- **Pausable** emergency stop for state changes.
- **Commit–Reveal** prevents bid front-running.
- **Integer safety** via Solidity 0.8.x.
- **Pull Withdrawal** pattern to avoid direct ETH transfers in state changes.

## Metadata & Assets

- **Metadata JSON** files stored locally in `frontend/src/TokenURI/` (e.g. `Pikachu.json`, `Charmander.json`).
- Each JSON contains:
  ```json
  {
    "name": "Pikachu",
    "description": "Electric-type Pokémon",
    "image": "https://yourdomain.com/images/Pikachu.png",
    "attributes": [ … ]
  }
  ```
- **Images** hosted on your website; metadata’s `image` points to the absolute URL.
- When minting, use the JSON URI (e.g. `"/TokenURI/Pikachu.json"` served by React).

## AI Tools Used

- **ChatGPT** for iterative code assistance (Solidity debugging, React hooks, README drafting).

## Optional Enhancements

- IPFS for decentralized metadata storage
- Dutch auctions or batch trading
- Advanced filtering & search in marketplace
- Mobile responsive design

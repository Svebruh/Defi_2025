// contracts/PokemonCardNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Using OpenZeppelin Contracts version 5.2
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonCardNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("PokemonCard", "PKMN") {}

    /**
     * @notice Mints a new Pokémon card NFT with its associated metadata URI.
     * @param to The address receiving the newly minted NFT.
     * @param tokenURI The metadata URI containing Pokémon characteristics.
     */
    function mint(address to, string memory tokenURI) external onlyOwner {
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol"; // add this
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonCardNFT is ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("PokemonCard", "PKMN") {}

    /**
     * @notice Mints a new Pokémon card NFT with its associated metadata URI.
     * @param to The address receiving the newly minted NFT.
     * @param _tokenURI The metadata URI containing Pokémon characteristics.
     */
    function mint(address to, string memory _tokenURI) external onlyOwner {
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    // The following functions are overrides required by Solidity when inheriting from multiple contracts.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}

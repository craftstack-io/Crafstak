// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title craftmeetcode Genesis
/// @notice Fixed-supply ERC-721 with deterministic, fully on-chain generative pixel artwork.
contract CraftMeetCode is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant ALLOCATION_PER_POOL = 5_000;
    uint256 public constant FREE_MINT_FEE = 0.0001 ether;
    uint256 public constant PAID_MINT_PRICE = 0.001 ether;

    uint256 public totalSupply;
    uint256 public freeMinted;
    uint256 public paidMinted;
    address payable public treasury;

    event Minted(address indexed minter, uint256 indexed firstTokenId, uint256 quantity, bool paid);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    error ZeroQuantity();
    error FreeAllocationExceeded();
    error PaidAllocationExceeded();
    error TotalSupplyExceeded();
    error IncorrectPayment(uint256 expected, uint256 received);
    error InvalidTreasury();
    error TreasuryTransferFailed();
    error TokenNotMinted();

    constructor(address payable treasury_)
        ERC721("craftmeetcode Genesis", "CMC")
        Ownable(msg.sender)
    {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
        emit TreasuryUpdated(address(0), treasury_);
    }

    /// @notice Mint from the 5,000-piece freemint pool. Fee is forwarded directly to treasury.
    function mintFree(uint256 quantity) external payable nonReentrant {
        if (quantity == 0) revert ZeroQuantity();
        if (freeMinted + quantity > ALLOCATION_PER_POOL) revert FreeAllocationExceeded();
        if (totalSupply + quantity > MAX_SUPPLY) revert TotalSupplyExceeded();
        uint256 expected = FREE_MINT_FEE * quantity;
        if (msg.value != expected) revert IncorrectPayment(expected, msg.value);
        uint256 firstTokenId = totalSupply + 1;
        freeMinted += quantity;
        totalSupply += quantity;
        _mintRange(msg.sender, firstTokenId, quantity);
        _forwardPayment(expected);
        emit Minted(msg.sender, firstTokenId, quantity, false);
    }

    /// @notice Mint from the separate 5,000-piece paid pool.
    function mintPaid(uint256 quantity) external payable nonReentrant {
        if (quantity == 0) revert ZeroQuantity();
        if (paidMinted + quantity > ALLOCATION_PER_POOL) revert PaidAllocationExceeded();
        if (totalSupply + quantity > MAX_SUPPLY) revert TotalSupplyExceeded();
        uint256 expected = PAID_MINT_PRICE * quantity;
        if (msg.value != expected) revert IncorrectPayment(expected, msg.value);
        uint256 firstTokenId = totalSupply + 1;
        paidMinted += quantity;
        totalSupply += quantity;
        _mintRange(msg.sender, firstTokenId, quantity);
        _forwardPayment(expected);
        emit Minted(msg.sender, firstTokenId, quantity, true);
    }

    function freeRemaining() external view returns (uint256) { return ALLOCATION_PER_POOL - freeMinted; }
    function paidRemaining() external view returns (uint256) { return ALLOCATION_PER_POOL - paidMinted; }

    /// @notice Token art and JSON metadata are generated on-chain; no external metadata hosting is required.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotMinted();
        (string memory background, string memory glow, string memory accent, string memory style) = _traits(tokenId);
        string memory svg = _art(tokenId, background, glow, accent, style);
        string memory json = string(abi.encodePacked(
            '{"name":"craftmeetcode Genesis #', tokenId.toString(),
            '","description":"A generative pixel-art artifact where craft meets code. Artwork and traits are rendered fully on-chain.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Edition","value":"Genesis"},{"trait_type":"Style","value":"', style,
            '"},{"trait_type":"Palette","value":"', _paletteName(tokenId),
            '"},{"trait_type":"Token ID","value":', tokenId.toString(), '}]}'
        ));
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function setTreasury(address payable newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidTreasury();
        address previous = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(previous, newTreasury);
    }

    function _traits(uint256 tokenId) private pure returns (string memory bg, string memory glow, string memory accent, string memory style) {
        uint256 palette = (tokenId - 1) % 8;
        if (palette == 0) return ("090909", "FFD84A", "FFF0A0", _style(tokenId));
        if (palette == 1) return ("07121A", "42D6C5", "A5FFF0", _style(tokenId));
        if (palette == 2) return ("170C20", "D77BFF", "F1C2FF", _style(tokenId));
        if (palette == 3) return ("1B0D0B", "FF765E", "FFC2A1", _style(tokenId));
        if (palette == 4) return ("091626", "5C9DFF", "B6D9FF", _style(tokenId));
        if (palette == 5) return ("15100B", "F2A93B", "FFE1A1", _style(tokenId));
        if (palette == 6) return ("0C1710", "8FE35B", "D4FF9F", _style(tokenId));
        return ("1A0B16", "FF5FA8", "FFC0DF", _style(tokenId));
    }

    function _style(uint256 tokenId) private pure returns (string memory) {
        uint256 variant = (tokenId / 8) % 4;
        if (variant == 0) return "Terminal";
        if (variant == 1) return "Orbit Studio";
        if (variant == 2) return "Signal Maker";
        return "Dream Compiler";
    }

    function _paletteName(uint256 tokenId) private pure returns (string memory) {
        uint256 palette = (tokenId - 1) % 8;
        if (palette == 0) return "Solar Gold";
        if (palette == 1) return "Neon Teal";
        if (palette == 2) return "Violet Byte";
        if (palette == 3) return "Ember";
        if (palette == 4) return "Electric Blue";
        if (palette == 5) return "Amber";
        if (palette == 6) return "Pixel Moss";
        return "Cyber Rose";
    }

    function _art(uint256 id, string memory bg, string memory glow, string memory accent, string memory style) private pure returns (string memory) {
        string memory number = id.toString();
        string memory decor = _motif(id, glow);
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><defs><radialGradient id="g"><stop stop-color="#', glow, '" stop-opacity=".35"/><stop offset="1" stop-color="#', bg, '" stop-opacity="0"/></radialGradient></defs>',
            '<path fill="#', bg, '" d="M0 0h512v512H0z"/><path stroke="#', accent, '" stroke-opacity=".09" d="M0 64h512M0 128h512M0 192h512M0 256h512M0 320h512M0 384h512M0 448h512M64 0v512M128 0v512M192 0v512M256 0v512M320 0v512M384 0v512M448 0v512"/><circle cx="256" cy="225" r="185" fill="url(#g)"/>',
            '<g fill="#', glow, '" opacity=".9"><path d="M83 108h8v8h-8zm348 40h8v8h-8zM111 326h8v8h-8zm286-94h8v8h-8zM149 82h5v5h-5zm215 260h6v6h-6zM75 264h5v5h-5zm362 74h6v6h-6z"/><path d="M250 92h12v12h-12zM242 108h28v28h-28z"/></g>',
            '<g>', decor, '</g>',
            '<path fill="#', glow, '" d="M176 188h160v108H176z"/><path fill="#', accent, '" d="M188 200h136v83H188z"/><path fill="#', bg, '" d="M196 208h120v67H196z"/>',
            '<g fill="#', glow, '"><path d="M207 222h38v5h-38zm0 14h61v5h-61zm0 14h47v5h-47zm58-28h39v5h-39zm8 14h31v5h-31z"/></g><path fill="#', accent, '" d="M244 238h24v24h-24z" opacity=".85"/>',
            '<path fill="#', glow, '" d="M154 300h204l35 43H119z"/><path fill="#', accent, '" d="M167 307h178l22 27H145z"/><path fill="#', bg, '" d="M183 312h146l12 15H171z"/><g fill="#', glow, '"><path d="M181 314h15v5h-15zm22 0h15v5h-15zm22 0h15v5h-15zm22 0h15v5h-15zm22 0h15v5h-15zm22 0h15v5h-15zm22 0h15v5h-15zM192 323h16v4h-16zm26 0h16v4h-16zm26 0h16v4h-16zm26 0h16v4h-16zm26 0h16v4h-16z"/></g>',
            '<path fill="#', accent, '" d="M215 344h82v8h-82z"/><path fill="#', glow, '" d="M224 352h64v10h-64z" opacity=".5"/>',
            '<text x="256" y="420" fill="#', accent, '" font-family="monospace" font-size="13" text-anchor="middle" letter-spacing="3">CRAFT MEETS CODE</text><text x="256" y="449" fill="#', glow, '" font-family="monospace" font-size="10" text-anchor="middle">', style, '  /  #', number, '</text></svg>'
        ));
    }

    function _motif(uint256 id, string memory glow) private pure returns (string memory) {
        uint256 variant = (id / 8) % 4;
        if (variant == 0) return string(abi.encodePacked('<path d="M256 76v48m-24-24h48M126 170h22m-11-11v22m204 164h20m-10-10v20" stroke="#', glow, '" stroke-width="6" opacity=".9"/>'));
        if (variant == 1) return string(abi.encodePacked('<path d="M256 66l12 30 32 4-24 21 7 32-27-17-27 17 7-32-24-21 32-4z" fill="#', glow, '" opacity=".65"/>'));
        if (variant == 2) return string(abi.encodePacked('<circle cx="256" cy="106" r="28" fill="none" stroke="#', glow, '" stroke-width="5"/><circle cx="256" cy="106" r="42" fill="none" stroke="#', glow, '" stroke-width="2" opacity=".55"/><path d="M98 202h42m232-32h42" stroke="#', glow, '" stroke-width="5"/>'));
        return string(abi.encodePacked('<path d="M226 78h20v20h-20zm44 0h20v20h-20zm-22 22h20v20h-20zm-132 62h18v18h-18zm236 30h18v18h-18z" fill="#', glow, '"/><path d="M256 62v18m-9-9h18" stroke="#', glow, '" stroke-width="5"/>'));
    }

    function _mintRange(address recipient, uint256 firstTokenId, uint256 quantity) private {
        for (uint256 i; i < quantity; ++i) _safeMint(recipient, firstTokenId + i);
    }

    function _forwardPayment(uint256 amount) private {
        (bool success, ) = treasury.call{value: amount}("");
        if (!success) revert TreasuryTransferFailed();
    }
}

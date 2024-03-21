// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

abstract contract TransferBlacklist is ERC721 {
    mapping(address => bool) public blacklistOperators;

    modifier requireNotBlacklisted(address to) {
        require(
            !blacklistOperators[to],
            "TransferBlacklist: recipient is blacklisted"
        );
        _;
    }

    function addToBlacklist(address _address) public virtual {
        blacklistOperators[_address] = true;
    }

    function removeFromBlacklist(address _address) public virtual {
        blacklistOperators[_address] = false;
    }

    function approve(
        address to,
        uint256 tokenId
    ) public virtual override requireNotBlacklisted(to) {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override requireNotBlacklisted(operator) {
        super.setApprovalForAll(operator, approved);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

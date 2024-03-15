// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILazyStaff.sol";

contract BatchMinter is Ownable {
    ILazyStaff public lazyStaff;

    constructor(ILazyStaff _nft) {
        lazyStaff = ILazyStaff(_nft);
    }

    function batchMint(
        address user,
        uint256[] calldata tokenIds
    ) external onlyOwner {
        for (uint256 i; i < tokenIds.length;) {
            lazyStaff.mintNewNft(user, tokenIds[i], "", ILazyStaff.NftSkills(2, 2, 2, 2, 2), 10, ILazyStaff.StaffNFTRarity.Common, false);

            unchecked {
                ++i;
            }
        }
    }
}
